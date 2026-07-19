import React from 'react';

const SignalCard = ({ signalAction, direction }) => {
  const parseSignalAction = (action) => {
    if (!action) return { label: 'N/A', lane: 'N/A', type: 'normal' };

    const parts = action.split('_');
    if (parts.length < 3) return { label: action, lane: 'N/A', type: 'normal' };

    const type = parts[0]; // PRIORITY or FORCE
    const status = parts[1]; // GREEN
    const lane = parts[2]; // L1, L2, L3

    const isForce = type === 'FORCE';
    const label = `${type} ${status}`;

    return {
      label,
      lane,
      type: isForce ? 'force' : 'priority',
    };
  };

  const signal = parseSignalAction(signalAction);

  const getBadgeClass = () => {
    if (signal.type === 'force') {
      return 'ops-badge critical';
    }
    return 'ops-badge warning';
  };

  return (
    <div className="ops-card rounded-lg p-3 flex-shrink-0">
      <div className="text-[10px] text-text-muted font-bold tracking-widest uppercase mb-2">Signal Override</div>
      
      <div className="space-y-2">
        <div className={`${getBadgeClass()} w-full text-center py-2 text-xs`}>
          {signal.label}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-ops-panel rounded p-2 text-center border border-ops-border">
            <div className="text-[9px] text-text-muted mb-0.5 font-semibold tracking-wide">TARGET LANE</div>
            <div className="text-xl font-black text-alert-blue">{signal.lane}</div>
          </div>
          
          <div className="bg-ops-panel rounded p-2 text-center border border-ops-border">
            <div className="text-[9px] text-text-muted mb-0.5 font-semibold tracking-wide">DIRECTION</div>
            <div className="text-sm font-bold text-text-primary uppercase">
              {direction || 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignalCard;
