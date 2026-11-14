document.addEventListener('DOMContentLoaded', () => {
  const navButtons = document.querySelectorAll('.nav-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const toast = document.getElementById('toast');

  const sessionDateInput = document.getElementById('session-date');
  const sessionCourseSelect = document.getElementById('session-course');
  const facultyNameInput = document.getElementById('faculty-name');
  const facultyStudentList = document.getElementById('faculty-student-list');
  const submitAttendanceBtn = document.getElementById('submit-attendance-btn');
  const markAllPresentBtn = document.getElementById('mark-all-present');
  const markAllAbsentBtn = document.getElementById('mark-all-absent');

  const studentSearchForm = document.getElementById('student-search-form');
  const studentRollInput = document.getElementById('student-roll-search');
  const studentResultContainer = document.getElementById('student-result-container');
  const resStudentName = document.getElementById('res-student-name');
  const resStudentRoll = document.getElementById('res-student-roll');
  const resStudentPct = document.getElementById('res-student-pct');
  const resStudentEligibility = document.getElementById('res-student-eligibility');
  const resStudentPresent = document.getElementById('res-student-present');
  const resStudentTotal = document.getElementById('res-student-total');
  const resStudentAbsent = document.getElementById('res-student-absent');
  const resStudentLate = document.getElementById('res-student-late');
  const studentHistoryList = document.getElementById('student-history-list');

  const addStudentForm = document.getElementById('add-student-form');
  const adminStudentsTable = document.getElementById('admin-students-table');
  const studentsCountBadge = document.getElementById('students-count-badge');
  const logViewer = document.getElementById('log-viewer');
  const refreshLogsBtn = document.getElementById('refresh-logs-btn');

  let registeredStudents = [];

  if (sessionDateInput) {
    sessionDateInput.value = new Date().toISOString().split('T')[0];
  }

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      navButtons.forEach((b) => b.classList.remove('active'));
      tabPanes.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const activePane = document.getElementById(`${targetTab}-tab`);
      if (activePane) activePane.classList.add('active');

      if (targetTab === 'admin') {
        loadAuditLogs();
        loadStudents();
      } else if (targetTab === 'faculty') {
        loadStudents();
      }
    });
  });

  const showToast = (message, type = 'success') => {
    toast.textContent = message;
    toast.className = `toast toast-${type}`;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 4500);
  };

  const loadStudents = async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) {
        registeredStudents = data.data;
        renderFacultyStudentList();
        renderAdminStudentsTable();
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const renderFacultyStudentList = () => {
    if (!facultyStudentList) return;

    if (registeredStudents.length === 0) {
      facultyStudentList.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted">
            No students registered yet. Add students from the Admin Console.
          </td>
        </tr>`;
      return;
    }

    facultyStudentList.innerHTML = registeredStudents
      .map(
        (s, idx) => `
      <tr data-id="${s._id}" data-roll="${s.rollNumber}" data-name="${s.name}">
        <td><strong>${s.rollNumber}</strong></td>
        <td>${s.name}</td>
        <td>${s.course}</td>
        <td>
          <div class="status-pill-group">
            <label class="status-pill present">
              <input type="radio" name="status-${idx}" value="Present" checked>
              <span>Present</span>
            </label>
            <label class="status-pill absent">
              <input type="radio" name="status-${idx}" value="Absent">
              <span>Absent</span>
            </label>
            <label class="status-pill late">
              <input type="radio" name="status-${idx}" value="Late">
              <span>Late</span>
            </label>
          </div>
        </td>
        <td>
          <input type="text" class="form-control remark-input" style="padding:0.3rem 0.5rem; font-size:0.85rem;" placeholder="Optional remark">
        </td>
      </tr>`
      )
      .join('');
  };

  if (markAllPresentBtn) {
    markAllPresentBtn.addEventListener('click', () => {
      document.querySelectorAll('#faculty-student-list input[value="Present"]').forEach((r) => (r.checked = true));
    });
  }
  if (markAllAbsentBtn) {
    markAllAbsentBtn.addEventListener('click', () => {
      document.querySelectorAll('#faculty-student-list input[value="Absent"]').forEach((r) => (r.checked = true));
    });
  }

  if (submitAttendanceBtn) {
    submitAttendanceBtn.addEventListener('click', async () => {
      const date = sessionDateInput.value;
      const course = sessionCourseSelect.value;
      const facultyName = facultyNameInput.value.trim() || 'Faculty In-Charge';

      const rows = document.querySelectorAll('#faculty-student-list tr[data-roll]');
      if (rows.length === 0) {
        showToast('No students to mark attendance for.', 'error');
        return;
      }

      const records = [];
      rows.forEach((row) => {
        const studentId = row.getAttribute('data-id');
        const rollNumber = row.getAttribute('data-roll');
        const studentName = row.getAttribute('data-name');
        const checkedRadio = row.querySelector('input[type="radio"]:checked');
        const remarks = row.querySelector('.remark-input').value.trim();

        records.push({
          studentId,
          rollNumber,
          studentName,
          status: checkedRadio ? checkedRadio.value : 'Present',
          remarks
        });
      });

      try {
        submitAttendanceBtn.disabled = true;
        submitAttendanceBtn.textContent = 'Saving...';

        const res = await fetch('/api/attendance/mark', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, course, facultyName, records })
        });
        const data = await res.json();

        if (data.success) {
          showToast(`Attendance marked for ${records.length} students.`, 'success');
        } else {
          showToast(data.message || 'Failed to save attendance', 'error');
        }
      } catch (err) {
        showToast('Server error while saving attendance.', 'error');
      } finally {
        submitAttendanceBtn.disabled = false;
        submitAttendanceBtn.textContent = 'Save Attendance';
      }
    });
  }

  if (studentSearchForm) {
    studentSearchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const roll = studentRollInput.value.trim().toUpperCase();
      if (!roll) return;

      try {
        const res = await fetch(`/api/attendance/student/${roll}`);
        const data = await res.json();

        if (!data.success) {
          showToast(data.message || 'Student not found', 'error');
          studentResultContainer.classList.add('hidden');
          return;
        }

        const { student, summary, history } = data;
        resStudentName.textContent = student.name;
        resStudentRoll.textContent = `Roll: ${student.rollNumber} | ${student.course}`;
        resStudentPct.textContent = `${summary.attendancePercentage}%`;
        resStudentPresent.textContent = summary.presentCount;
        resStudentTotal.textContent = `out of ${summary.totalSessions} sessions`;
        resStudentAbsent.textContent = summary.absentCount;
        resStudentLate.textContent = summary.lateCount;

        if (summary.isShortage) {
          resStudentEligibility.textContent = 'Shortage (< 75%)';
          resStudentEligibility.className = 'badge badge-danger';
          resStudentPct.style.color = '#dc2626';
        } else {
          resStudentEligibility.textContent = 'Eligible (>= 75%)';
          resStudentEligibility.className = 'badge badge-success';
          resStudentPct.style.color = '#16a34a';
        }

        if (history.length === 0) {
          studentHistoryList.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No attendance sessions recorded yet.</td></tr>`;
        } else {
          studentHistoryList.innerHTML = history
            .map(
              (h) => `
            <tr>
              <td>${h.date}</td>
              <td>${h.course}</td>
              <td>${h.faculty}</td>
              <td>
                <span class="badge ${
                  h.status === 'Present' ? 'badge-success' : h.status === 'Absent' ? 'badge-danger' : 'badge-warning'
                }">${h.status}</span>
              </td>
              <td>${h.remarks || '-'}</td>
            </tr>`
            )
            .join('');
        }

        studentResultContainer.classList.remove('hidden');
      } catch (err) {
        showToast('Error querying student attendance.', 'error');
      }
    });
  }

  const renderAdminStudentsTable = () => {
    if (!adminStudentsTable) return;
    studentsCountBadge.textContent = `${registeredStudents.length} Students`;

    if (registeredStudents.length === 0) {
      adminStudentsTable.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No students found. Register students above.</td></tr>`;
      return;
    }

    adminStudentsTable.innerHTML = registeredStudents
      .map(
        (s) => `
      <tr>
        <td><strong>${s.rollNumber}</strong></td>
        <td>${s.name}</td>
        <td>${s.email || '-'}</td>
        <td>${s.course}</td>
        <td>${s.batch}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="window.deleteStudent('${s._id}')">Delete</button>
        </td>
      </tr>`
      )
      .join('');
  };

  if (addStudentForm) {
    addStudentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rollNumber = document.getElementById('new-roll').value.trim();
      const name = document.getElementById('new-name').value.trim();
      const email = document.getElementById('new-email').value.trim();
      const course = document.getElementById('new-course').value.trim();

      try {
        const res = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rollNumber, name, email, course })
        });
        const data = await res.json();

        if (data.success) {
          showToast(`Student ${data.data.name} registered successfully.`, 'success');
          addStudentForm.reset();
          loadStudents();
        } else {
          showToast(data.message || 'Error adding student', 'error');
        }
      } catch (err) {
        showToast('Network error while registering student.', 'error');
      }
    });
  }

  window.deleteStudent = async (id) => {
    if (!confirm('Are you sure you want to delete this student record?')) return;
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Student deleted.', 'success');
        loadStudents();
      } else {
        showToast(data.message || 'Error deleting student.', 'error');
      }
    } catch (err) {
      showToast('Server error.', 'error');
    }
  };

  const loadAuditLogs = async () => {
    if (!logViewer) return;
    try {
      const res = await fetch('/api/attendance/logs');
      const data = await res.json();
      if (data.success) {
        if (data.logs.length === 0) {
          logViewer.textContent = 'No audit log entries recorded yet in logs/attendance.log.';
        } else {
          logViewer.textContent = data.logs.join('\n');
        }
      }
    } catch (err) {
      logViewer.textContent = 'Error loading logs from server.';
    }
  };

  if (refreshLogsBtn) {
    refreshLogsBtn.addEventListener('click', loadAuditLogs);
  }

  loadStudents();
});
