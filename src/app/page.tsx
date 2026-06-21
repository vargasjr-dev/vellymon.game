import { redirect } from "next/navigation";
import { auth } from "../lib/auth.server";
import { headers } from "next/headers";

const FLOATING_MONS = [
  { emoji: "🐲", anim: "animate-float-a", delay: "0s",   top: "8%",  left: "5%"  },
  { emoji: "⚡",  anim: "animate-float-b", delay: "1s",   top: "15%", left: "88%" },
  { emoji: "🔥", anim: "animate-float-c", delay: "2s",   top: "70%", left: "7%"  },
  { emoji: "💎", anim: "animate-float-a", delay: "3s",   top: "80%", left: "91%" },
  { emoji: "🌊", anim: "animate-float-b", delay: "0.5s", top: "40%", left: "3%"  },
  { emoji: "⚔️", anim: "animate-float-c", delay: "1.5s", top: "55%", left: "93%" },
  { emoji: "🛡️", anim: "animate-float-a", delay: "2.5s", top: "25%", left: "12%" },
  { emoji: "💀", anim: "animate-float-b", delay: "4s",   top: "85%", left: "50%" },
  { emoji: "✨", anim: "animate-float-c", delay: "0.8s", top: "12%", left: "45%" },
  { emoji: "🌟", anim: "animate-float-a", delay: "3.5s", top: "60%", left: "80%" },
];

const MONS = [
  {
    name: "Voidclaw",
    archetype: "Glass Cannon",
    archetypeEmoji: "💀",
    power: "Void Rend",
    powerDesc: "Drains 2 energy from enemies after every attack",
    hp: 37, atk: 17, spd: 5,
    gradient: "from-purple-900/60 to-slate-900/60",
    border: "border-purple-500/40",
    accent: "text-purple-400",
  },
  {
    name: "Aerobolt",
    archetype: "Speedster",
    archetypeEmoji: "⚡",
    power: "Shockwave Trail",
    powerDesc: "Leaves a damaging shockwave on every move tile",
    hp: 55, atk: 10, spd: 8,
    gradient: "from-yellow-900/60 to-slate-900/60",
    border: "border-yellow-500/40",
    accent: "text-yellow-400",
  },
  {
    name: "Barrikade",
    archetype: "Tank",
    archetypeEmoji: "🛡️",
    power: "Iron Curtain",
    powerDesc: "Attackers lose 2 SPD the turn after they strike",
    hp: 105, atk: 9, spd: 2,
    gradient: "from-sky-900/60 to-slate-900/60",
    border: "border-sky-500/40",
    accent: "text-sky-400",
  },
  {
    name: "Dewdrop",
    archetype: "Support",
    archetypeEmoji: "💚",
    power: "Cleansing Mist",
    powerDesc: "Heals the lowest-HP ally at the start of every turn",
    hp: 70, atk: 7, spd: 4,
    gradient: "from-green-900/60 to-slate-900/60",
    border: "border-green-500/40",
    accent: "text-green-400",
  },
];

// 5-wide × 3-tall mini arena preview
// null = empty, team "a" = orange, team "b" = blue
const ARENA: (null | { team: "a" | "b"; emoji: string })[][] = [
  [{ team: "a", emoji: "🛡️" }, { team: "a", emoji: "💀" }, null, null,              { team: "b", emoji: "⚡" }],
  [null,                        { team: "a", emoji: "⚡" }, null, { team: "b", emoji: "🛡️" }, null             ],
  [{ team: "a", emoji: "💚" }, null,                        null, null,              { team: "b", emoji: "💀" }],
];

export default async function HomePage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (session) {
    redirect("/player");
  }

  return (
    <main className="bg-slate-950 text-white overflow-x-hidden">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-arena-grid">

        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950" />

        {/* Radial glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-sky-600/5 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-orange-500/6 blur-2xl pointer-events-none" />

        {/* Floating mons */}
        {FLOATING_MONS.map((m, i) => (
          <span
            key={i}
            className={`absolute text-4xl select-none pointer-events-none opacity-20 ${m.anim}`}
            style={{ top: m.top, left: m.left, animationDelay: m.delay }}
          >
            {m.emoji}
          </span>
        ))}

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <div className="inline-block mb-8 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm font-semibold tracking-widest uppercase">
            ⚡ Early Access — Join the Arena
          </div>

          <h1 className="text-[clamp(4rem,15vw,9rem)] font-black leading-none tracking-tight mb-6">
            <span className="bg-gradient-to-r from-sky-400 via-white to-orange-400 bg-clip-text text-transparent">
              VELLY
            </span>
            <span className="bg-gradient-to-r from-orange-400 via-white to-sky-400 bg-clip-text text-transparent">
              MON
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-slate-300 mb-3 font-light">
            64 monsters. 1 arena.{" "}
            <span className="text-white font-semibold">Zero turns wasted.</span>
          </p>
          <p className="text-slate-400 mb-12 max-w-lg mx-auto leading-relaxed">
            Build a squad, seize territory, and outthink every opponent — in a
            simultaneous-action battle where hesitation costs you the match.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 text-white font-bold text-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 transition-all duration-200"
            >
              🎮 Play Now — It&apos;s Free
            </a>
            <a
              href="/guide"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl border-2 border-sky-500/50 text-sky-400 font-bold text-lg hover:bg-sky-500/10 hover:border-sky-400 transition-all duration-200"
            >
              📖 How to Play
            </a>
          </div>
        </div>

        {/* Bottom fade into next section */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
      </section>

      {/* ── Three Pillars ─────────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            {
              icon: "⚡",
              title: "Simultaneous Action",
              desc: "Every player acts at once. No waiting for your opponent's turn — pure real-time strategy with no downtime.",
            },
            {
              icon: "🗺️",
              title: "Territorial Control",
              desc: "Capture zones, hold ground, and pressure your opponent. Positioning wins matches, not just raw power.",
            },
            {
              icon: "🏆",
              title: "Ranked Ladder",
              desc: "Climb from Bronze to Legend. Every win and loss shapes your rank — build the squad that goes the distance.",
            },
          ].map((p) => (
            <div
              key={p.title}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 hover:border-sky-500/30 hover:bg-slate-900 transition-all duration-300 group"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                {p.icon}
              </div>
              <h3 className="text-xl font-bold mb-2">{p.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Arena Preview ─────────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-3">The Arena Awaits</h2>
          <p className="text-slate-400 mb-14 max-w-xl mx-auto">
            Deploy across a tactical grid. Move, attack, and hold zones — all in
            the same heartbeat as your opponent.
          </p>

          <div className="inline-block rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-2xl">
            <div className="flex justify-between text-xs font-bold tracking-widest uppercase mb-3 px-1">
              <span className="text-orange-400">Your Team</span>
              <span className="text-sky-400">Opponent</span>
            </div>
            <div className="flex flex-col gap-2">
              {ARENA.map((row, ri) => (
                <div key={ri} className="flex gap-2">
                  {row.map((cell, ci) => (
                    <div
                      key={ci}
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-2xl border transition-all duration-300 ${
                        cell === null
                          ? "bg-slate-800/40 border-slate-700/40"
                          : cell.team === "a"
                          ? "bg-orange-500/20 border-orange-500/50 shadow-lg shadow-orange-500/10"
                          : "bg-sky-500/20 border-sky-500/50 shadow-lg shadow-sky-500/10"
                      }`}
                    >
                      {cell?.emoji ?? ""}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p className="text-slate-600 text-xs mt-4 tracking-wide">
              move · attack · occupy · win
            </p>
          </div>
        </div>
      </section>

      {/* ── Mon Showcase ──────────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">Meet the Roster</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              64 vellymons. Each with a unique passive power. No two squads play alike.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MONS.map((mon) => (
              <div
                key={mon.name}
                className={`rounded-2xl bg-gradient-to-b ${mon.gradient} border ${mon.border} p-6 hover:scale-105 transition-transform duration-300`}
              >
                <div className="text-3xl mb-3">{mon.archetypeEmoji}</div>
                <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${mon.accent}`}>
                  {mon.archetype}
                </div>
                <h3 className="text-xl font-black mb-1">{mon.name}</h3>
                <div className="text-xs text-slate-300 font-semibold mb-1">✦ {mon.power}</div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">{mon.powerDesc}</p>
                <div className="flex gap-3 text-xs text-slate-500">
                  <span>❤️ {mon.hp}</span>
                  <span>⚔️ {mon.atk}</span>
                  <span>💨 {mon.spd}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-slate-600 text-sm mt-6">
            + 60 more waiting in the arena
          </p>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-950/20 via-slate-950 to-blue-950/20 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] rounded-full bg-orange-500/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-black mb-4">
            Ready to build your squad?
          </h2>
          <p className="text-slate-400 mb-10 text-lg">
            Free to play. Jump in and start collecting, battling, and climbing the ranks.
          </p>
          <a
            href="/signup"
            className="inline-flex items-center justify-center gap-3 px-14 py-5 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-400 text-white font-black text-xl shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 transition-all duration-200"
          >
            Start Playing →
          </a>
          <div className="mt-8">
            <a
              href="/login"
              className="text-slate-500 hover:text-slate-400 text-sm transition-colors"
            >
              Already have an account? Sign in
            </a>
          </div>
        </div>
      </section>

    </main>
  );
}
