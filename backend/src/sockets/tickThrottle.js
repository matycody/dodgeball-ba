// Cuántos ticks del reloj reciben los espectadores. Con SPECTATOR_TICK_SECONDS = 1 (por defecto) no cambia nada:
// un tick por segundo. Con 5, el servidor manda el reloj cada 5 s y el cliente cuenta los segundos del medio.
// Los cambios de estado (pausa, tiempo muerto, sanciones, fin) y los 0:00 salen siempre al instante.
// Quien opera la mesa (sala de control) sigue recibiendo un tick por segundo.
const SLACK_MS = 150; // tolerancia: el intervalo del motor nunca es exacto

const isZero = (t) => t === '0:00' || t === '00:00';

// Firma de lo que NO es el paso del tiempo: si cambia, hay que avisar ya
function signature(p) {
  return JSON.stringify([
    p.isMatchPaused, p.isSetPaused, p.matchHalf, p.timeoutTeam, p.isTimeoutRunning, p.timeoutsUsed, p.recovered, p.matchEnded,
    (p.sanctions || []).map((x) => [x.id, x.side, x.kind, x.setsLeft]),
  ]);
}

function createThrottle(seconds) {
  const every = Math.max(1, Math.floor(Number(seconds)) || 1);
  const state = new Map(); // matchId -> { sig, at }

  return {
    every,
    // true = emitir este tick a los espectadores
    shouldEmit(matchId, payload, fromTick, now = Date.now()) {
      if (every <= 1) return true;
      const prev = state.get(matchId);
      const sig = signature(payload);
      const mark = () => state.set(matchId, { sig, at: now });
      if (!fromTick || !prev || prev.sig !== sig) { mark(); return true; }
      const zero = (!payload.isMatchPaused && isZero(payload.matchTime)) || (!payload.isSetPaused && isZero(payload.setTime)) || (payload.isTimeoutRunning && isZero(payload.timeoutTime));
      if (zero || now - prev.at >= every * 1000 - SLACK_MS) { mark(); return true; }
      return false;
    },
    forget(matchId) { state.delete(matchId); },
  };
}

module.exports = { createThrottle };
