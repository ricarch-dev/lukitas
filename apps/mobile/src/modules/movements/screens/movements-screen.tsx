import type { AccountDto, TransactionDto } from '@lukitas/contracts';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  Filter,
  List,
  Plus,
  Search,
  ArrowLeftRight,
} from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSession } from '../../../session/SessionContext';
import { APP_COLORS as colors } from '../../../shared/theme/app-colors';
import { MovementForm } from '../components/movement-form';
import { MovementsCalendar } from '../components/movements-calendar';
import { MovementsHeader } from '../components/movements-header';
import {
  calendarMonths,
  canExportMovements,
  changeMonth,
  filterMovements,
  monthlyFlow,
  movementAmount,
  movementDay,
  movementsCsv,
} from '../presentation/movements';
import { saveMovementsCsv } from '../actions/download-movements';
import { loadMovementsData, type MovementCategory, type MovementReport } from '../actions/load-movements';
import { styles } from './movements-styles';

type SearchPage = { readonly items: TransactionDto[]; readonly hasMore: boolean };
type FormMode = 'INCOME' | 'EXPENSE' | 'TRANSFER' | null;
const monthNow = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (month: string) =>
  new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(
    new Date(`${month}-15T12:00:00`),
  );
const searchPath = (search: string, kind?: string, categoryId?: string, skip = 0) =>
  `/reports/search?${new URLSearchParams({ search: search.trim(), ...(kind ? { kind } : {}), ...(categoryId ? { categoryId } : {}), skip: String(skip) }).toString()}`;

export function MovementsScreen() {
  const { client } = useSession();
  const [month, setMonth] = useState(monthNow);
  const [report, setReport] = useState<MovementReport | null>(null);
  const [loadedMonth, setLoadedMonth] = useState('');
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [categories, setCategories] = useState<MovementCategory[]>([]);
  const [categoriesUnavailable, setCategoriesUnavailable] = useState(false);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<'month' | 'all'>('month');
  const [searchPage, setSearchPage] = useState<SearchPage | null>(null);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchGeneration = useRef(0);
  const pageLock = useRef(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [kind, setKind] = useState<'INCOME' | 'EXPENSE' | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [form, setForm] = useState<FormMode>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError('');
      loadMovementsData(client, month)
        .then(({ report: nextReport, accounts: nextAccounts, categories: nextCategories, categoriesUnavailable: missing }) => {
          if (!active) return;
          setReport(nextReport);
          setLoadedMonth(month);
          setAccounts(nextAccounts);
          setCategories(nextCategories);
          setCategoriesUnavailable(missing);
        })
        .catch(() => {
          if (active) {
            setReport(null);
            setLoadedMonth('');
            setError('No pudimos cargar tus movimientos. Revisa tu conexión e intenta de nuevo.');
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [client, month, revision]),
  );

  useFocusEffect(
    useCallback(() => {
      const generation = ++searchGeneration.current;
      if (scope !== 'all') {
        setSearchPage(null);
        setSearchError('');
        return;
      }
      let active = true;
      setSearchPage(null);
      setSearchError('');
      setSearchBusy(true);
      const timer = setTimeout(() => {
        client
          .get<SearchPage>(searchPath(search, kind, categoryId))
          .then((page) => {
            if (active && generation === searchGeneration.current) setSearchPage(page);
          })
          .catch(() => {
            if (active && generation === searchGeneration.current) setSearchError('No pudimos buscar movimientos. Intenta de nuevo.');
          })
          .finally(() => {
            if (active && generation === searchGeneration.current) setSearchBusy(false);
          });
      }, 250);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }, [client, scope, search, kind, categoryId, revision]),
  );

  const visible = useMemo(
    () =>
      filterMovements(scope === 'all' ? (searchPage?.items ?? []) : (report?.items ?? []), {
        search: scope === 'month' ? search : undefined,
        kind,
        categoryId,
      }),
    [scope, searchPage, report, search, kind, categoryId],
  );
  const totals = useMemo(() => monthlyFlow(report?.items ?? []), [report]);
  const exportReady = canExportMovements(
    loadedMonth,
    month,
    report !== null,
    loading || exporting,
    error,
  );
  const label = monthLabel(month);
  const flowLabel = (amounts: Record<string, string>) =>
    Object.keys(amounts).length
      ? Object.entries(amounts)
          .map(([currency, value]) => movementAmount(value, currency))
          .join(' · ')
      : movementAmount('0.00', report?.baseCurrency ?? 'USD');

  async function download() {
    if (!report || !exportReady) return;
    setExporting(true);
    setError('');
    try {
      const accountNames = Object.fromEntries(
        accounts.map((account) => [account.id, account.name]),
      );
      const categoryNames = Object.fromEntries(
        categories.map((category) => [category.id, category.name]),
      );
      await saveMovementsCsv(
        movementsCsv(report.items, accountNames, categoryNames),
        `movimientos-${month}.csv`,
      );
    } catch {
      setError('No pudimos descargar el archivo. Intenta de nuevo.');
    } finally {
      setExporting(false);
    }
  }

  async function loadMore() {
    if (!searchPage?.hasMore || searchBusy || pageLock.current) return;
    const generation = searchGeneration.current;
    pageLock.current = true;
    setSearchBusy(true);
    try {
      const next = await client.get<SearchPage>(
        searchPath(search, kind, categoryId, searchPage.items.length),
      );
      if (generation === searchGeneration.current)
        setSearchPage({ items: [...searchPage.items, ...next.items], hasMore: next.hasMore });
    } catch {
      if (generation === searchGeneration.current)
        setSearchError('No pudimos cargar más movimientos. Intenta de nuevo.');
    } finally {
      pageLock.current = false;
      if (generation === searchGeneration.current) setSearchBusy(false);
    }
  }

  function navigateMonth(offset: number) {
    setReport(null);
    setLoadedMonth('');
    setMonth(changeMonth(month, offset));
  }

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <MovementsHeader
            exportReady={exportReady}
            exporting={exporting}
            onDownload={() => void download()}
          />
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Search size={20} color={colors.body} />
              <TextInput
                accessibilityLabel="Buscar movimiento"
                placeholder="Buscar movimiento..."
                placeholderTextColor={colors.muted}
                value={search}
                onChangeText={(value) => {
                  setSearch(value);
                  if (value.trim()) setScope('all');
                }}
                style={styles.searchInput}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Filtrar movimientos"
              accessibilityState={{ expanded: filterOpen }}
              onPress={() => setFilterOpen(!filterOpen)}
              style={styles.roundSmall}
            >
              <Filter size={22} color={colors.ink} />
            </Pressable>
          </View>
          {filterOpen ? (
            <View style={styles.filters}>
              <Text style={styles.sectionTitle}>Período del historial</Text>
              <View style={styles.pills}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: scope === 'month' }}
                  onPress={() => setScope('month')}
                  style={[styles.pill, scope === 'month' && styles.pillSelected]}
                >
                  <Text style={styles.pillText}>Mes seleccionado</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: scope === 'all' }}
                  onPress={() => setScope('all')}
                  style={[styles.pill, scope === 'all' && styles.pillSelected]}
                >
                  <Text style={styles.pillText}>Todos los meses</Text>
                </Pressable>
              </View>
              <Text style={styles.sectionTitle}>Tipo</Text>
              <View style={styles.pills}>
                {(
                  [
                    ['Todos', undefined],
                    ['Ingresos', 'INCOME'],
                    ['Egresos', 'EXPENSE'],
                  ] as const
                ).map(([name, value]) => (
                  <Pressable
                    key={name}
                    accessibilityRole="button"
                    accessibilityState={{ selected: kind === value }}
                    onPress={() => setKind(value)}
                    style={[styles.pill, kind === value && styles.pillSelected]}
                  >
                    <Text style={styles.pillText}>{name}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.sectionTitle}>Categoría</Text>
              {categoriesUnavailable ? <Text style={styles.muted}>Las categorías no están disponibles por ahora.</Text> : null}
              <View style={styles.pills}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setCategoryId(undefined)}
                  style={[styles.pill, !categoryId && styles.pillSelected]}
                >
                  <Text style={styles.pillText}>Todas</Text>
                </Pressable>
                {categories.map((category) => (
                  <Pressable
                    key={category.id}
                    accessibilityRole="button"
                    onPress={() => setCategoryId(category.id)}
                    style={[styles.pill, categoryId === category.id && styles.pillSelected]}
                  >
                    <Text style={styles.pillText}>{category.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nuevo movimiento"
              onPress={() => setForm('EXPENSE')}
              style={styles.action}
            >
              <View style={styles.actionCircle}>
                <Plus size={30} color={colors.ink} />
              </View>
              <Text style={styles.actionText}>Movimiento</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Transferir entre cuentas"
              onPress={() => setForm('TRANSFER')}
              style={styles.action}
            >
              <View style={styles.actionCircle}>
                <ArrowLeftRight size={29} color={colors.ink} />
              </View>
              <Text style={styles.actionText}>Transferir</Text>
            </Pressable>
          </View>
          <View style={styles.monthBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mes anterior"
              onPress={() => navigateMonth(-1)}
              style={styles.monthArrow}
            >
              <ArrowLeft size={24} color={colors.ink} />
            </Pressable>
            <Text style={styles.monthText}>{label[0].toUpperCase() + label.slice(1)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mes siguiente"
              onPress={() => navigateMonth(1)}
              style={styles.monthArrow}
            >
              <ArrowRight size={24} color={colors.ink} />
            </Pressable>
          </View>
          <View style={styles.summary}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryLabel}>
                <View style={[styles.badge, styles.incomeBadge]}>
                  <ArrowUp size={18} color={colors.surface} />
                </View>
                <Text>Ingresos</Text>
              </View>
              <Text selectable style={styles.summaryAmount}>
                {flowLabel(totals.income)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryLabel}>
                <View style={[styles.badge, styles.expenseBadge]}>
                  <ArrowDown size={18} color={colors.surface} />
                </View>
                <Text>Egresos</Text>
              </View>
              <Text selectable style={styles.summaryAmount}>
                {flowLabel(totals.expense)}
              </Text>
            </View>
          </View>
          <View style={styles.historyHeading}>
            <Text accessibilityRole="header" style={styles.historyTitle}>
              Historial{scope === 'all' ? ' · Todos los meses' : ''}
            </Text>
            <View style={styles.switcher}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver como lista"
                accessibilityState={{ selected: view === 'list' }}
                onPress={() => setView('list')}
                style={[styles.switchButton, view === 'list' && styles.switchActive]}
              >
                <List size={21} color={colors.ink} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver como calendario"
                accessibilityState={{ selected: view === 'calendar' }}
                onPress={() => setView('calendar')}
                style={[styles.switchButton, view === 'calendar' && styles.switchActive]}
              >
                <CalendarDays size={21} color={colors.ink} />
              </Pressable>
            </View>
          </View>
          {error ? (
            <Pressable accessibilityRole="button" onPress={() => setRevision((value) => value + 1)}>
              <Text accessibilityRole="alert" style={styles.error}>
                {error} Toca para reintentar.
              </Text>
            </Pressable>
          ) : null}
          {scope === 'all' && searchError ? <Text accessibilityRole="alert" style={styles.error}>{searchError}</Text> : null}
          {loading || (scope === 'all' && searchBusy && !searchPage) ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.muted}>Cargando movimientos…</Text>
            </View>
          ) : visible.length ? (
            view === 'list' ? (
              <View style={styles.list}>
                {visible.map((item) => (
                  <View key={item.id} style={styles.row}>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>
                        {item.note ||
                          (item.transferId
                            ? 'Transferencia'
                            : item.kind === 'INCOME'
                              ? 'Ingreso'
                              : 'Egreso')}
                      </Text>
                      <Text style={styles.muted}>
                        {movementDay(item.occurredAt, report?.timezone ?? 'UTC')} ·{' '}
                        {accounts.find((account) => account.id === item.accountId)?.name ??
                          'Cuenta'}
                      </Text>
                    </View>
                    <Text
                      selectable
                      style={[styles.rowAmount, item.kind === 'EXPENSE' && styles.negative]}
                    >
                      {item.kind === 'EXPENSE' ? '−' : '+'}
                      {movementAmount(item.amount, item.currencyCode)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.calendars}>
                {(scope === 'all'
                  ? calendarMonths(visible, report?.timezone ?? 'UTC')
                  : [month]
                ).map((period) => (
                  <View key={period} style={styles.calendars}>
                    <Text style={styles.sectionTitle}>{monthLabel(period)}</Text>
                    <MovementsCalendar
                      month={period}
                      items={visible}
                      timezone={report?.timezone ?? 'UTC'}
                    />
                  </View>
                ))}
              </View>
            )
          ) : (
            <View style={styles.empty}>
              <ArrowLeftRight size={24} color={colors.body} />
              <Text style={styles.emptyTitle}>Sin movimientos</Text>
              <Text style={styles.muted}>Aquí verás todos tus ingresos y egresos registrados.</Text>
            </View>
          )}
          {scope === 'all' && searchPage?.hasMore ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: searchBusy }}
              onPress={() => void loadMore()}
              style={styles.more}
            >
              <Text style={styles.moreText}>
                {searchBusy ? 'Cargando…' : 'Cargar más movimientos'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
      <MovementForm
        accounts={accounts}
        mode={form}
        onModeChange={setForm}
        onClose={() => setForm(null)}
        onSaved={() => {
          setForm(null);
          setReport(null);
          setLoadedMonth('');
          setMonth(monthNow());
          setRevision((value) => value + 1);
        }}
      />
    </>
  );
}
