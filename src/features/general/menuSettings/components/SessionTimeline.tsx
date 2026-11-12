/** A 24-hour bar showing when menu sessions run (a session over midnight shows at both ends of the day). */
import { DAY_MINUTES, daySegments, formatSessionHours } from "../utils/sessionTime";

export interface TimelineSession {
  key: string | number;
  name: string;
  start: string;
  end: string;
  /** The session being edited: drawn strong; the others faint. */
  highlight?: boolean;
  inactive?: boolean;
}

const TICKS = [
  { at: 0, label: "12 AM" },
  { at: 6 * 60, label: "6 AM" },
  { at: 12 * 60, label: "12 PM" },
  { at: 18 * 60, label: "6 PM" },
  { at: DAY_MINUTES, label: "12 AM" },
];

const pct = (minutes: number) => `${(minutes / DAY_MINUTES) * 100}%`;

/** One row: the session's name and its hours on the day bar. */
export const SessionTimelineRow = ({ session, showName = true }: { session: TimelineSession; showName?: boolean }) => {
  const tone = session.highlight
    ? "bg-[#49293e]"
    : session.inactive
      ? "bg-slate-300"
      : "bg-[#49293e]/35";
  return (
    <div className="flex items-center gap-3">
      {showName && (
        <span className={`w-28 shrink-0 truncate text-[11px] font-bold ${session.highlight ? "text-[#49293e]" : "text-slate-500"}`} title={session.name}>
          {session.name || "This session"}
        </span>
      )}
      <div className="relative h-5 flex-1 rounded-md bg-slate-100 overflow-hidden" title={`${session.name}: ${formatSessionHours(session.start, session.end)}`}>
        {/* 6-hour grid */}
        {TICKS.slice(1, -1).map((t) => (
          <span key={t.at} className="absolute inset-y-0 w-px bg-white" style={{ left: pct(t.at) }} />
        ))}
        {daySegments(session.start, session.end).map(([from, to]) => (
          <span key={from} className={`absolute inset-y-0.5 rounded ${tone}`} style={{ left: pct(from), width: pct(to - from) }} />
        ))}
      </div>
    </div>
  );
};

/** The hour labels under the bars. `indent` lines them up with rows that show a name. */
export const SessionTimelineAxis = ({ indent = true }: { indent?: boolean }) => (
  <div className="flex items-center gap-3">
    {indent && <span className="w-28 shrink-0" />}
    <div className="relative flex-1 h-4">
      {TICKS.map((t, i) => (
        <span
          key={i}
          className="absolute text-[9px] font-bold text-slate-400 whitespace-nowrap"
          style={{ left: pct(t.at), transform: i === 0 ? "none" : i === TICKS.length - 1 ? "translateX(-100%)" : "translateX(-50%)" }}
        >
          {t.label}
        </span>
      ))}
    </div>
  </div>
);
