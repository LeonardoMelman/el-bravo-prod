import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/lib/currentUser"
import JoinGroupModal from "@/src/components/JoinGroupModal";
import ThemeSelectorHome from "@/src/components/ThemeSelectorHome";
import ChangelogModal from "@/src/components/ChangelogModal";
import { prisma } from "@/src/lib/db";

const gymQuotes = [
  { quote: "No cuentes los días, hacé que los días cuenten.", author: "Muhammad Ali" },
  { quote: "La fuerza no viene de la capacidad física, sino de una voluntad indomable.", author: "Mahatma Gandhi" },
  { quote: "El dolor es temporal, rendirse dura para siempre.", author: "Lance Armstrong" },
  { quote: "La diferencia entre lo imposible y lo posible está en la determinación.", author: "Tommy Lasorda" },
  { quote: "La excelencia no es un acto, sino un hábito.", author: "Aristóteles" },
  { quote: "Lo que hacés hoy puede mejorar todos tus mañanas.", author: "Ralph Marston" },
  { quote: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", author: "Robert Collier" },
  { quote: "La acción es la clave fundamental de todo éxito.", author: "Pablo Picasso" },
  { quote: "La energía y la persistencia conquistan todas las cosas.", author: "Benjamin Franklin" },
  { quote: "Nunca sabés qué tan fuerte sos hasta que ser fuerte es tu única opción.", author: "Bob Marley" },
  { quote: "Todo logro empieza con la decisión de intentarlo.", author: "John F. Kennedy" },
  { quote: "La calidad de tu vida depende de la calidad de tus hábitos.", author: "James Clear" },
  { quote: "Primero dominá tus hábitos, después tus hábitos te dominan a vos.", author: "John Dryden" },
  { quote: "Una meta sin plan es solo un deseo.", author: "Antoine de Saint-Exupéry" },
  { quote: "El trabajo duro vence al talento cuando el talento no trabaja duro.", author: "Tim Notke" },
  { quote: "La confianza viene de la preparación.", author: "Kobe Bryant" },
  { quote: "No pares cuando estés cansado, pará cuando hayas terminado.", author: "David Goggins" },
  { quote: "Los campeones siguen jugando hasta que les sale bien.", author: "Billie Jean King" },
  { quote: "No hay atajos para ningún lugar al que valga la pena llegar.", author: "Beverly Sills" },
  { quote: "La persistencia puede cambiar el fracaso en logro extraordinario.", author: "Matt Biondi" },
  { quote: "El éxito generalmente llega a quienes están demasiado ocupados para buscarlo.", author: "Henry David Thoreau" },
  { quote: "La disciplina es el puente entre metas y logros.", author: "Jim Rohn" },
  { quote: "El éxito no es definitivo, el fracaso no es fatal: lo que cuenta es el coraje para continuar.", author: "Winston Churchill" },
  { quote: "Actuá como si lo que hacés marcara la diferencia. Porque lo hace.", author: "William James" },
  { quote: "El único lugar donde el éxito viene antes que el trabajo es en el diccionario.", author: "Vidal Sassoon" },
  { quote: "La motivación es lo que te pone en marcha, el hábito es lo que hace que sigas.", author: "Jim Ryun" },
  { quote: "El futuro depende de lo que hagas hoy.", author: "Mahatma Gandhi" },
  { quote: "No podés poner límite a nada. Cuanto más soñás, más lejos llegás.", author: "Michael Phelps" },
  { quote: "Si algo está entre vos y tu éxito, movelo. Nunca te niegues.", author: "Dwayne Johnson" },
  { quote: "El dolor que sentís hoy es la fuerza que sentirás mañana.", author: "Arnold Schwarzenegger" },
  { quote: "La mente es todo. En lo que pensás te convertís.", author: "Buda" },
  { quote: "El esfuerzo continuo, no la fuerza o inteligencia, es la clave para desbloquear nuestro potencial.", author: "Winston Churchill" },
  { quote: "La vida es como andar en bicicleta. Para mantener el equilibrio, debés seguir moviéndote.", author: "Albert Einstein" },
  { quote: "Siempre parece imposible hasta que se hace.", author: "Nelson Mandela" },
  { quote: "No te limites. Muchas personas se limitan a lo que creen que pueden hacer.", author: "Mary Kay Ash" },
  { quote: "Haz lo que puedas, con lo que tengas, donde estés.", author: "Theodore Roosevelt" },
  { quote: "La suerte es lo que sucede cuando la preparación se encuentra con la oportunidad.", author: "Séneca" },
  { quote: "Cuanto más duro trabajo, más suerte tengo.", author: "Gary Player" },
  { quote: "La mejor forma de predecir el futuro es crearlo.", author: "Peter Drucker" },
  { quote: "Convertite en la persona que querés ser.", author: "Jim Rohn" },
  { quote: "La diferencia entre ganar y perder es muchas veces no rendirse.", author: "Walt Disney" },
  { quote: "El progreso es imposible sin cambio.", author: "George Bernard Shaw" },
  { quote: "No tengas miedo de fallar. Tené miedo de no intentarlo.", author: "Roy T. Bennett" },
  { quote: "Si querés algo que nunca tuviste, tenés que hacer algo que nunca hiciste.", author: "Thomas Jefferson" },
  { quote: "El éxito es ir de fracaso en fracaso sin perder el entusiasmo.", author: "Winston Churchill" },
  { quote: "El secreto para salir adelante es empezar.", author: "Mark Twain" },
  { quote: "La determinación de hoy crea el éxito de mañana.", author: "Anónimo (atribuida, uso común)" },
];

function getRandomGymQuote() {
  return gymQuotes[Math.floor(Math.random() * gymQuotes.length)];
}

type ActivityForHome = {
  startedAt: Date;
};

type HomeRoutineItem = {
  id: string;
  name: string;
  exercises: {
    id: string;
    exercise: {
      id: string;
      name: string;
    };
  }[];
};

type HomeMembershipItem = {
  id: string;
  joinedAt: Date;
  role: string;
  groupId: string;
  group: {
    id: string;
    name: string;
    photoUrl: string | null;
    members: {
      user: {
        id: string;
        name: string | null;
        email: string;
        photoUrl: string | null;
      };
    }[];
    seasons: {
      id: string;
      name: string | null;
      startDate: Date;
      endDate: Date | null;
    }[];
  };
};

function getInitial(value: string | null | undefined) {
  return (value || "U").charAt(0).toUpperCase();
}

function getWeekStart(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getWeekKey(date: Date) {
  return getWeekStart(date).toISOString().slice(0, 10);
}

function computeHomeStats(
  activities: ActivityForHome[],
  weeklyGoal: number
): { activeWeeks: number; perfectWeeks: number; workoutsThisWeek: number } {
  const now = new Date();
  const currentWeekKey = getWeekKey(now);
  const currentWeekStart = getWeekStart(now);

  const weekCounts = new Map<string, number>();

  for (const activity of activities) {
    const key = getWeekKey(activity.startedAt);
    weekCounts.set(key, (weekCounts.get(key) ?? 0) + 1);
  }

  const allWeekStartsDesc = Array.from(weekCounts.keys())
    .map((weekKey) => getWeekStart(new Date(`${weekKey}T12:00:00`)))
    .sort((a, b) => b.getTime() - a.getTime());

  let activeWeeks = 0;
  let perfectWeeks = 0;

  for (const weekStart of allWeekStartsDesc) {
    const weekKey = getWeekKey(weekStart);
    const count = weekCounts.get(weekKey) ?? 0;
    const isCurrentWeek = weekStart.getTime() === currentWeekStart.getTime();

    if (isCurrentWeek) {
      if (count >= 1) activeWeeks += 1;
      continue;
    }

    if (count >= 1) {
      activeWeeks += 1;
    } else {
      break;
    }
  }

  for (const weekStart of allWeekStartsDesc) {
    const weekKey = getWeekKey(weekStart);
    const count = weekCounts.get(weekKey) ?? 0;
    const isCurrentWeek = weekStart.getTime() === currentWeekStart.getTime();

    if (isCurrentWeek) {
      if (count >= weeklyGoal) perfectWeeks += 1;
      continue;
    }

    if (count >= weeklyGoal) {
      perfectWeeks += 1;
    } else {
      break;
    }
  }

  const workoutsThisWeek = weekCounts.get(currentWeekKey) ?? 0;

  return { activeWeeks, perfectWeeks, workoutsThisWeek };
}

function isSeasonActive(season: { startDate: Date; endDate: Date | null } | null) {
  if (!season) return false;
  const now = new Date();
  const start = new Date(season.startDate);
  const end = season.endDate ? new Date(season.endDate) : null;
  if (now < start) return false;
  if (end && now > end) return false;
  return true;
}

function getGroupCardClasses(hasActiveSeason: boolean) {
  if (hasActiveSeason) {
    return "bg-gradient-to-r from-lime-900/70 via-yellow-900/35 to-slate-900 hover:brightness-110";
  }
  return "bg-slate-900 hover:bg-slate-800";
}

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const motivationalQuote = getRandomGymQuote();

  const [dbUserRaw, membershipsRaw, routinesRaw, activitiesRaw] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, photoUrl: true, weeklyGoal: true },
    }),
    prisma.groupMember.findMany({
      where: { userId: user.id, leftAt: null },
      orderBy: { joinedAt: "desc" },
      include: {
        group: {
          include: {
            members: {
              where: { leftAt: null },
              select: {
                user: {
                  select: { id: true, name: true, email: true, photoUrl: true },
                },
              },
            },
            seasons: {
              orderBy: { startDate: "desc" },
              take: 1,
              select: { id: true, name: true, startDate: true, endDate: true },
            },
          },
        },
      },
    }),
    prisma.routine.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        exercises: {
          select: {
            id: true,
            exercise: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.activity.findMany({
      where: { userId: user.id, isDeleted: false },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    }),
  ]);

  const dbUser = dbUserRaw;
  if (!dbUser) {
    redirect("/login");
  }

  const memberships = membershipsRaw as unknown as HomeMembershipItem[];
  const routines = routinesRaw as unknown as HomeRoutineItem[];
  const activities = activitiesRaw as unknown as ActivityForHome[];

  const weeklyGoal =
    typeof dbUser.weeklyGoal === "number" && dbUser.weeklyGoal > 0
      ? dbUser.weeklyGoal
      : 3;

  const stats = computeHomeStats(activities, weeklyGoal);

  const totalDots = Math.min(Math.max(weeklyGoal, stats.workoutsThisWeek, 1), 7);
  const filledDots = Math.min(stats.workoutsThisWeek, 7);

  return (
    <main className="t-page-bg min-h-screen px-3 py-4 text-white sm:px-4 sm:py-5 md:px-6 md:py-6">
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-5">
        <ThemeSelectorHome position="top" />

        {/* ─── HERO: Current week progress + CTA ───────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">

          {/* Week progress — visually dominant */}
          <div className="rounded-2xl bg-slate-900/70 p-5 sm:p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-lime-400">
              Semana en curso
            </p>
            <p className="mb-5 text-4xl font-bold leading-none text-white sm:text-5xl">
              {stats.workoutsThisWeek}
              <span className="ml-2 text-xl font-normal text-slate-400 sm:text-2xl">
                / {weeklyGoal} entrenamientos
              </span>
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {Array.from({ length: totalDots }).map((_, index) => {
                const filled = index < filledDots;
                return (
                  <span
                    key={index}
                    className={`block h-9 w-9 rounded-full border-[3px] sm:h-10 sm:w-10 ${
                      filled
                        ? "border-lime-500 bg-lime-500/20"
                        : "t-circle-empty bg-transparent"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Right column: CTA + streak stats */}
          <div className="flex flex-col gap-3">
            <a
              href="/load"
              className="flex flex-1 items-center justify-center rounded-2xl bg-gradient-to-b from-lime-600 to-lime-800 px-4 py-5 text-center text-xl font-bold text-white shadow-md transition hover:from-lime-500 hover:to-lime-700"
            >
              Registrar entrenamiento
            </a>

            <div className="grid grid-cols-2 gap-3">
              <div className="t-accent-surface rounded-2xl p-4 text-center">
                <div className="text-4xl font-bold text-white">{stats.activeWeeks}</div>
                <div className="mt-1 text-xs font-medium text-slate-400">semanas activas</div>
              </div>
              <div className="rounded-2xl bg-lime-600 p-4 text-center">
                <div className="text-4xl font-bold text-white">{stats.perfectWeeks}</div>
                <div className="mt-1 text-xs font-medium text-lime-100">semanas perfectas</div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── GROUPS ──────────────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-slate-900/70 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-white">Grupos</h2>
            <div className="flex gap-2">
              <JoinGroupModal
                buttonClassName="inline-flex items-center justify-center rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600"
              />
              <a
                href="/create-group"
                className="inline-flex items-center justify-center rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600"
              >
                Crear grupo
              </a>
            </div>
          </div>

          {memberships.length === 0 ? (
            <div className="rounded-xl bg-slate-800 p-4 text-sm text-slate-400">
              No estás en ningún grupo todavía.
            </div>
          ) : (
            <div className="space-y-2">
              {memberships.map((membership) => {
                const season = membership.group.seasons?.[0] ?? null;
                const activeSeason = isSeasonActive(season);

                return (
                  <a
                    key={membership.id}
                    href={`/group/${membership.groupId}`}
                    className={`flex items-center gap-3 rounded-xl p-3 transition sm:p-4 ${getGroupCardClasses(activeSeason)}`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-700 text-lg font-bold text-white">
                      {membership.group.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={membership.group.photoUrl}
                          alt={membership.group.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{getInitial(membership.group.name)}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-bold leading-tight text-white sm:text-lg">
                        {membership.group.name}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        {season
                          ? season.name ?? "Temporada activa"
                          : "Sin temporada"}{" "}
                        · {membership.group.members.length} miembros
                      </div>
                    </div>

                    <div className="flex shrink-0 -space-x-2">
                      {membership.group.members.slice(0, 3).map((member) => (
                        <div
                          key={member.user.id}
                          className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-slate-700 text-[10px] text-white ring-2 ring-slate-900"
                          title={member.user.name ?? member.user.email}
                        >
                          {member.user.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={member.user.photoUrl}
                              alt={member.user.name ?? member.user.email}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span>
                              {getInitial(member.user.name ?? member.user.email)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── ROUTINES ────────────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-slate-900/70 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-white">Rutinas</h2>
            <a
              href="/routine"
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600"
            >
              Ver todas
            </a>
          </div>

          {routines.length === 0 ? (
            <div className="rounded-xl bg-slate-800 p-4 text-sm text-slate-400">
              Todavía no tenés rutinas creadas.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {routines.map((routine) => (
                <div
                  key={routine.id}
                  className="rounded-xl bg-gradient-to-r from-red-700/80 to-violet-700/80 p-[1px]"
                >
                  <div className="rounded-xl bg-slate-900 px-4 py-4">
                    <div className="break-words text-sm font-bold text-white">
                      {routine.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {routine.exercises.length} ejercicio
                      {routine.exercises.length === 1 ? "" : "s"}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {routine.exercises.slice(0, 3).map((item) => (
                        <span
                          key={item.id}
                          className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
                        >
                          {item.exercise.name}
                        </span>
                      ))}
                      {routine.exercises.length > 3 ? (
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                          +{routine.exercises.length - 3}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}

              <a
                href="/create-routine"
                className="flex min-h-[100px] items-center justify-center rounded-xl bg-slate-700 text-4xl font-bold text-white transition hover:bg-slate-600"
              >
                +
              </a>
            </div>
          )}
        </section>

        {/* ─── QUOTE — decorative ──────────────────────────────────────────── */}
        <div className="px-2 py-2 text-center">
          <blockquote className="text-sm italic text-slate-500">
            &ldquo;{motivationalQuote.quote}&rdquo;
          </blockquote>
          <p className="mt-1 text-xs text-slate-600">— {motivationalQuote.author}</p>
          <div className="mt-4 flex justify-center">
            <ChangelogModal />
          </div>
        </div>

        <ThemeSelectorHome position="bottom" />
      </div>
    </main>
  );
}