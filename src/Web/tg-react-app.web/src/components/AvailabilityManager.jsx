import { useState, useEffect } from 'react';
import { fetchMyAvailability, addOffDay, deleteOffDay, bulkDeleteOffDays, addBreak, deleteBreak } from '../services/specialistApi';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

export default function AvailabilityManager() {
  const [availability, setAvailability] = useState({ offDays: [], breaks: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Off Day form
  const [showOffDayForm, setShowOffDayForm] = useState(false);
  const [offDayData, setOffDayData] = useState({ date: '', reason: '', repeatWeekly: false, repeatWeeks: 12 });
  
  // Break form
  const [showBreakForm, setShowBreakForm] = useState(false);
  const [breakData, setBreakData] = useState({
    dayOfWeek: '',
    startTime: '12:00',
    endTime: '13:00',
    description: '',
    isRecurring: true,
    specificDate: ''
  });

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchMyAvailability();
      setAvailability(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOffDay = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (offDayData.repeatWeekly) {
        // Add multiple off days for the same day of week
        const startDate = new Date(offDayData.date);
        const weeks = offDayData.repeatWeeks || 12;
        
        for (let i = 0; i < weeks; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + (i * 7));
          const dateStr = date.toISOString().split('T')[0];
          try {
            await addOffDay(dateStr, offDayData.reason || null);
          } catch (err) {
            // Skip if date already exists
            console.log(`Skipping ${dateStr}: ${err.message}`);
          }
        }
      } else {
        await addOffDay(offDayData.date, offDayData.reason || null);
      }
      setOffDayData({ date: '', reason: '', repeatWeekly: false, repeatWeeks: 12 });
      setShowOffDayForm(false);
      await loadAvailability();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteOffDay = async (id) => {
    if (!confirm('Remove this off day?')) return;
    try {
      await deleteOffDay(id);
      await loadAvailability();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddBreak = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        dayOfWeek: breakData.dayOfWeek === '' ? null : parseInt(breakData.dayOfWeek),
        startTime: breakData.startTime,
        endTime: breakData.endTime,
        description: breakData.description || null,
        isRecurring: breakData.isRecurring,
        specificDate: breakData.isRecurring ? null : breakData.specificDate || null
      };
      await addBreak(payload);
      setBreakData({
        dayOfWeek: '',
        startTime: '12:00',
        endTime: '13:00',
        description: '',
        isRecurring: true,
        specificDate: ''
      });
      setShowBreakForm(false);
      await loadAvailability();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteBreak = async (id) => {
    if (!confirm('Remove this break?')) return;
    try {
      await deleteBreak(id);
      await loadAvailability();
    } catch (err) {
      setError(err.message);
    }
  };

  const getDayLabel = (dayOfWeek) => {
    if (dayOfWeek === null || dayOfWeek === undefined) return 'Every day';
    return DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || dayOfWeek;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatShortDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Group off days by day of week and reason for recurring patterns
  const groupOffDays = (offDays) => {
    if (!offDays || offDays.length === 0) return [];
    
    // Sort by date
    const sorted = [...offDays].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Group by day of week + reason
    const groups = {};
    const standalone = [];
    
    sorted.forEach(offDay => {
      const date = new Date(offDay.date + 'T00:00:00');
      const dayOfWeek = date.getDay();
      const reason = offDay.reason || '';
      const key = `${dayOfWeek}-${reason}`;
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(offDay);
    });
    
    // Check which groups are recurring (at least 3 entries, roughly weekly apart)
    const result = [];
    
    Object.entries(groups).forEach(([key, items]) => {
      if (items.length >= 3) {
        // Check if they're weekly (7 days apart)
        let isWeekly = true;
        for (let i = 1; i < Math.min(items.length, 5); i++) {
          const diff = (new Date(items[i].date) - new Date(items[i-1].date)) / (1000 * 60 * 60 * 24);
          if (diff !== 7) {
            isWeekly = false;
            break;
          }
        }
        
        if (isWeekly) {
          // Bundle as recurring
          const firstDate = new Date(items[0].date + 'T00:00:00');
          const lastDate = new Date(items[items.length - 1].date + 'T00:00:00');
          result.push({
            type: 'recurring',
            dayOfWeek: firstDate.getDay(),
            dayName: DAYS_OF_WEEK.find(d => d.value === firstDate.getDay())?.label,
            reason: items[0].reason,
            startDate: items[0].date,
            endDate: items[items.length - 1].date,
            count: items.length,
            ids: items.map(i => i.id)
          });
        } else {
          // Not weekly, show individually
          items.forEach(item => {
            result.push({ type: 'single', ...item });
          });
        }
      } else {
        // Less than 3, show individually
        items.forEach(item => {
          result.push({ type: 'single', ...item });
        });
      }
    });
    
    // Sort: recurring first, then singles by date
    return result.sort((a, b) => {
      if (a.type === 'recurring' && b.type !== 'recurring') return -1;
      if (a.type !== 'recurring' && b.type === 'recurring') return 1;
      const dateA = a.type === 'recurring' ? a.startDate : a.date;
      const dateB = b.type === 'recurring' ? b.startDate : b.date;
      return new Date(dateA) - new Date(dateB);
    });
  };

  const handleDeleteRecurringGroup = async (ids) => {
    if (!confirm(`Remove all ${ids.length} recurring off days?`)) return;
    setError('');
    try {
      await bulkDeleteOffDays(ids);
      await loadAvailability();
    } catch (err) {
      setError(err.message);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  if (isLoading) return <p>Loading availability...</p>;

  return (
    <div className="availability-manager">
      {error && (
        <div role="alert" className="error-message">
          {error}
        </div>
      )}

      {/* Off Days Section */}
      <div className="availability-section card" style={{ marginBottom: '1.5rem' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>📅 Off Days</h3>
          {!showOffDayForm && (
            <button onClick={() => setShowOffDayForm(true)} className="btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
              + Add Off Day
            </button>
          )}
        </div>

        {showOffDayForm && (
          <form onSubmit={handleAddOffDay} className="mini-form" style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-800)', borderRadius: '0.5rem' }}>
            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                value={offDayData.date}
                onChange={(e) => setOffDayData({ ...offDayData, date: e.target.value })}
                min={getMinDate()}
                required
              />
              {offDayData.date && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {new Date(offDayData.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long' })}
                </p>
              )}
            </div>
            <div className="form-group">
              <label>Reason (optional)</label>
              <input
                type="text"
                value={offDayData.reason}
                onChange={(e) => setOffDayData({ ...offDayData, reason: e.target.value })}
                placeholder="e.g., Holiday, Personal day"
              />
            </div>
            {offDayData.date && (
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={offDayData.repeatWeekly}
                    onChange={(e) => setOffDayData({ ...offDayData, repeatWeekly: e.target.checked })}
                  />
                  Repeat every {new Date(offDayData.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long' })}
                </label>
                {offDayData.repeatWeekly && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>For</label>
                    <select
                      value={offDayData.repeatWeeks}
                      onChange={(e) => setOffDayData({ ...offDayData, repeatWeeks: parseInt(e.target.value) })}
                      style={{ width: 'auto', padding: '0.25rem 0.5rem' }}
                    >
                      <option value={4}>4 weeks</option>
                      <option value={8}>8 weeks</option>
                      <option value={12}>12 weeks</option>
                      <option value={26}>26 weeks (6 months)</option>
                      <option value={52}>52 weeks (1 year)</option>
                      <option value={104}>104 weeks (2 years)</option>
                      <option value={520}>Forever (10 years)</option>
                    </select>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn-primary" style={{ fontSize: '0.85rem' }}>
                {offDayData.repeatWeekly 
                  ? (offDayData.repeatWeeks >= 520 ? 'Add Off Days (Forever)' : `Add ${offDayData.repeatWeeks} Off Days`)
                  : 'Add'}
              </button>
              <button type="button" onClick={() => setShowOffDayForm(false)} className="btn-cancel" style={{ fontSize: '0.85rem' }}>Cancel</button>
            </div>
          </form>
        )}

        {availability.offDays.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No off days scheduled. You&apos;re available every day!</p>
        ) : (
          <div className="off-days-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {groupOffDays(availability.offDays).map((item, index) => (
              item.type === 'recurring' ? (
                <div key={`recurring-${index}`} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '0.75rem',
                  background: 'var(--bg-800)',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--primary)',
                  borderLeft: '4px solid var(--primary)'
                }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Every {item.dayName}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.85rem' }}>
                      ({formatShortDate(item.startDate)} → {formatShortDate(item.endDate)})
                    </span>
                    {item.reason && <span style={{ color: 'var(--text-muted)', marginLeft: '0.75rem' }}>— {item.reason}</span>}
                    <span style={{ 
                      marginLeft: '0.5rem', 
                      fontSize: '0.75rem', 
                      background: 'var(--primary)', 
                      color: 'white', 
                      padding: '0.15rem 0.4rem', 
                      borderRadius: '0.25rem' 
                    }}>
                      {item.count} weeks
                    </span>
                  </div>
                  <button 
                    onClick={() => handleDeleteRecurringGroup(item.ids)} 
                    className="btn-delete"
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                  >
                    ✕ All
                  </button>
                </div>
              ) : (
                <div key={item.id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '0.75rem',
                  background: 'var(--bg-800)',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)'
                }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{formatDate(item.date)}</span>
                    {item.reason && <span style={{ color: 'var(--text-muted)', marginLeft: '0.75rem' }}>— {item.reason}</span>}
                  </div>
                  <button 
                    onClick={() => handleDeleteOffDay(item.id)} 
                    className="btn-delete"
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                  >
                    ✕
                  </button>
                </div>
              )
            ))}
          </div>
        )}
      </div>

      {/* Breaks Section */}
      <div className="availability-section card">
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>☕ Breaks</h3>
          {!showBreakForm && (
            <button onClick={() => setShowBreakForm(true)} className="btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
              + Add Break
            </button>
          )}
        </div>

        {showBreakForm && (
          <form onSubmit={handleAddBreak} className="mini-form" style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-800)', borderRadius: '0.5rem' }}>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={breakData.isRecurring}
                  onChange={(e) => setBreakData({ ...breakData, isRecurring: e.target.checked })}
                  style={{ marginRight: '0.5rem' }}
                />
                Recurring weekly break
              </label>
            </div>

            {breakData.isRecurring ? (
              <div className="form-group">
                <label>Day of Week</label>
                <select
                  value={breakData.dayOfWeek}
                  onChange={(e) => setBreakData({ ...breakData, dayOfWeek: e.target.value })}
                >
                  <option value="">Every day</option>
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label>Specific Date *</label>
                <input
                  type="date"
                  value={breakData.specificDate}
                  onChange={(e) => setBreakData({ ...breakData, specificDate: e.target.value })}
                  min={getMinDate()}
                  required={!breakData.isRecurring}
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Start Time *</label>
                <input
                  type="time"
                  value={breakData.startTime}
                  onChange={(e) => setBreakData({ ...breakData, startTime: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>End Time *</label>
                <input
                  type="time"
                  value={breakData.endTime}
                  onChange={(e) => setBreakData({ ...breakData, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description (optional)</label>
              <input
                type="text"
                value={breakData.description}
                onChange={(e) => setBreakData({ ...breakData, description: e.target.value })}
                placeholder="e.g., Lunch break"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn-primary" style={{ fontSize: '0.85rem' }}>Add</button>
              <button type="button" onClick={() => setShowBreakForm(false)} className="btn-cancel" style={{ fontSize: '0.85rem' }}>Cancel</button>
            </div>
          </form>
        )}

        {availability.breaks.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No breaks scheduled.</p>
        ) : (
          <div className="breaks-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {availability.breaks.map((brk) => (
              <div key={brk.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '0.75rem',
                background: 'var(--bg-800)',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)'
              }}>
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
                    {brk.startTime} - {brk.endTime}
                  </span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: '0.75rem' }}>
                    {brk.isRecurring ? getDayLabel(brk.dayOfWeek) : formatDate(brk.specificDate)}
                  </span>
                  {brk.description && (
                    <span style={{ color: 'var(--accent-2)', marginLeft: '0.75rem' }}>({brk.description})</span>
                  )}
                </div>
                <button 
                  onClick={() => handleDeleteBreak(brk.id)} 
                  className="btn-delete"
                  style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
