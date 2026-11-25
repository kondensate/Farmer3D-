/**
 * Runtime gate used by the DSL interpreter before each statement.
 * A breakpoint blocks the interpreter before the statement executes.
 */
export function createDebuggerController(agent, onPause = () => {}) {
  if (!(agent.breakpoints instanceof Set)) agent.breakpoints = new Set(agent.breakpoints || []);
  if (!Number.isInteger(agent.debugSteps)) agent.debugSteps = 0;

  async function beforeStep(line, statement, snapshot) {
    const breakpointHit = agent.breakpoints.has(line);
    if (breakpointHit) {
      agent.pauseRequested = true;
      agent.pauseReason = 'точка останова';
      agent.debugLine = line;
      agent.stepOnce = false;
    }
    if (agent.pauseRequested && !agent.stopRequested && !agent.stepOnce) {
      agent.debugLine = line;
      onPause(snapshot, agent.pauseReason || 'пауза');
      await new Promise(resolve => { agent.resumeResolver = resolve; });
    }
    if (agent.stepOnce) {
      agent.stepOnce = false;
      agent.pauseRequested = true;
      agent.pauseReason = 'пауза после шага';
    }
    agent.debugLine = line;
    agent.debugSteps++;
    agent.resumeResolver = null;
  }

  return {
    beforeStep,
    pause() {
      if (!agent.running) return;
      agent.pauseRequested = true;
      agent.pauseReason = 'пауза после текущей команды';
    },
    step() {
      if (!agent.running) return;
      agent.pauseRequested = true;
      agent.pauseReason = 'один шаг';
      agent.stepOnce = true;
      agent.resumeResolver?.();
    },
    resume() {
      if (!agent.running) return;
      agent.pauseRequested = false;
      agent.pauseReason = '';
      agent.stepOnce = false;
      agent.resumeResolver?.();
      agent.resumeResolver = null;
    },
    stop() {
      agent.stopRequested = true;
      agent.pauseRequested = false;
      agent.stepOnce = false;
      agent.resumeResolver?.();
      agent.resumeResolver = null;
    }
  };
}
