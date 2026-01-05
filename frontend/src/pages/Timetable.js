import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Timetable.css';

const Timetable = () => {
  const { isAuthenticated } = useAuth();
  const [selectedClass, setSelectedClass] = useState('10');

  const classes = ['10', '9', '8', '7', '6'];

  // Define class-specific subjects and timetables
  const classSchedules = {
    '10': {
      subjects: ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi', 'Computer Science', 'Life Skills', 'Physical Education'],
      periods: 8,
    },
    '9': {
      subjects: ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi', 'Computer Science', 'Sanskrit', 'Art'],
      periods: 8,
    },
    '8': {
      subjects: ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi', 'Information Technology', 'Music', 'Drawing'],
      periods: 7,
    },
    '7': {
      subjects: ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi', 'Information Technology', 'Art', 'Sports'],
      periods: 7,
    },
    '6': {
      subjects: ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi', 'Information Technology', 'Drawing', 'Health'],
      periods: 6,
    },
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Generate timetable data for selected class
  const timetableData = useMemo(() => {
    const classConfig = classSchedules[selectedClass];
    const timetable = {};

    days.forEach((day, dayIndex) => {
      const periods = [];
      for (let p = 0; p < classConfig.periods; p++) {
        // Rotate subjects across days and periods to create variety
        const subjectIndex = (dayIndex * classConfig.periods + p) % classConfig.subjects.length;
        const subject = classConfig.subjects[subjectIndex];
        
        // Generate start time (starting at 8:30 AM, each period is 40 minutes)
        const startHour = 8;
        const startMinute = 30;
        const totalMinutes = startHour * 60 + startMinute + (p * 45); // 40 min class + 5 min break
        const hour = Math.floor(totalMinutes / 60);
        const minute = totalMinutes % 60;
        const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

        periods.push({
          period: p + 1,
          subject: subject,
          start_time: startTime,
          duration_minutes: 40
        });
      }
      timetable[day] = periods;
    });

    return {
      class: selectedClass,
      timetable: timetable,
      subjects: classConfig.subjects,
      totalPeriods: classConfig.periods
    };
  }, [selectedClass]);

  if (!isAuthenticated) {
    return <div className="alert alert-warning">Please login to view timetable</div>;
  }

  const dayColors = {
    Monday: '#FFD700',
    Tuesday: '#9370DB',
    Wednesday: '#FF6B6B',
    Thursday: '#4ECDC4',
    Friday: '#FFB347',
    Saturday: '#FFC0CB'
  };

  return (
    <div className="timetable-container">
      <div className="timetable-header">
        <h1>School Timetable</h1>
        <div className="class-selector">
          <label>Select Class & Section:</label>
          <div className="class-buttons">
            {classes.map((cls) => (
              <button
                key={cls}
                className={`class-btn ${selectedClass === cls ? 'active' : ''}`}
                onClick={() => setSelectedClass(cls)}
              >
                Class {cls}
              </button>
            ))}
          </div>
        </div>
      </div>

      {timetableData && (
        <div className="timetable-wrapper">
          <div className="timetable-title">
            <h2>Class {timetableData.class} - Weekly Schedule</h2>
          </div>

          <div className="timetable-table">
            <table>
              <thead>
                <tr>
                  <th className="time-header">Period / Time</th>
                  {days.map((day) => (
                    <th
                      key={day}
                      className="day-header"
                      style={{ backgroundColor: dayColors[day] }}
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Generate rows for each period */}
                {[...Array(timetableData.totalPeriods)].map((_, periodIdx) => (
                  <tr key={`period-${periodIdx}`} className="period-row">
                    <td className="period-time">
                      <div className="period-num">Period {periodIdx + 1}</div>
                      <div className="period-start">
                        {timetableData.timetable['Monday'][periodIdx].start_time}
                      </div>
                    </td>
                    {days.map((day) => {
                      const period = timetableData.timetable[day][periodIdx];
                      return (
                        <td key={`${day}-${periodIdx}`} className="period-cell">
                          <div className="subject-name">{period.subject}</div>
                          <div className="duration">{period.duration_minutes} min</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="timetable-info">
            <div className="info-box">
              <i className="fas fa-clock"></i>
              <span><strong>Timing:</strong> 8:30 AM - 3:30 PM (with breaks)</span>
            </div>
            <div className="info-box">
              <i className="fas fa-list"></i>
              <span><strong>Total Periods:</strong> {timetableData.totalPeriods} per day</span>
            </div>
            <div className="info-box">
              <i className="fas fa-hourglass-half"></i>
              <span><strong>Per Period:</strong> 40 minutes</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timetable;

