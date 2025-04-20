document.addEventListener('DOMContentLoaded', () => {
    // --- Selección de Elementos del DOM ---
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYearDisplay = document.getElementById('month-year');
    const prevMonthButton = document.getElementById('prev-month');
    const nextMonthButton = document.getElementById('next-month');
    const selectedDateDisplay = document.getElementById('selected-date-display');
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const activeTasksList = document.getElementById('active-tasks');
    const completedTasksList = document.getElementById('completed-tasks');
    const body = document.body;

    // --- Estado de la Aplicación ---
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let selectedDate = null; // Formato 'YYYY-MM-DD'
    const category = body.dataset.category; // 'escuela', 'gym', o 'varios'
    let tasks = loadTasks(); // Carga tareas desde localStorage
    
    // Exponer tasks al objeto window para que los modales puedan acceder
    window.appTasks = tasks;

    // --- Funciones ---

    // Cargar tareas desde localStorage
    function loadTasks() {
        const storedTasks = localStorage.getItem('jazOrgTasks');
        // Estructura: { categoria: { 'YYYY-MM-DD': { active: [], completed: [] }, ... }, ... }
        return storedTasks ? JSON.parse(storedTasks) : {};
    }
    // Exponer al objeto window
    window.loadTasks = loadTasks;

    // Guardar tareas en localStorage
    function saveTasks() {
        localStorage.setItem('jazOrgTasks', JSON.stringify(tasks));
        // Actualizar la referencia global
        window.appTasks = tasks;
    }
    // Exponer al objeto window
    window.saveTasks = saveTasks;

    // Obtener tareas para una fecha específica en la categoría actual
    function getTasksForDate(dateString) {
        // Devuelve la estructura aunque no exista para evitar errores
        return tasks[category]?.[dateString] || { active: [], completed: [] };
    }
    // Exponer al objeto window
    window.getTasksForDate = getTasksForDate;

    // Formatear fecha (Date -> 'YYYY-MM-DD')
    function formatDate(date) {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    // Renderizar el Calendario
    function renderCalendar(month, year) {
        calendarGrid.innerHTML = `
            <div class="day-header">Dom</div> <div class="day-header">Lun</div> <div class="day-header">Mar</div>
            <div class="day-header">Mié</div> <div class="day-header">Jue</div> <div class="day-header">Vie</div>
            <div class="day-header">Sáb</div>
        `; // Limpiar y añadir cabeceras

        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDayOfWeek = firstDayOfMonth.getDay(); // 0=Domingo

        monthYearDisplay.textContent = `${firstDayOfMonth.toLocaleString('es-ES', { month: 'long' })} ${year}`;

        const today = new Date();
        const todayString = formatDate(today);

        // Rellenar días vacíos al inicio
        for (let i = 0; i < startDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('day', 'other-month');
            calendarGrid.appendChild(emptyCell);
        }

        // Rellenar días del mes
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('day');
            dayCell.textContent = day;
            const currentDate = new Date(year, month, day);
            const currentDateString = formatDate(currentDate);
            dayCell.dataset.date = currentDateString;

            if (currentDateString === todayString) dayCell.classList.add('today');
            if (currentDateString === selectedDate) dayCell.classList.add('selected');

            const dayTasks = getTasksForDate(currentDateString);
            if (dayTasks.active.length > 0) dayCell.classList.add('has-tasks');

            dayCell.addEventListener('click', handleDayClick);
            calendarGrid.appendChild(dayCell);
        }
    }

    // Manejar clic en un día del calendario
    function handleDayClick(event) {
        const clickedCell = event.target.closest('.day');
        if (!clickedCell || clickedCell.classList.contains('other-month')) return;

        const newSelectedDate = clickedCell.dataset.date;

        const previouslySelected = calendarGrid.querySelector('.day.selected');
        if (previouslySelected) previouslySelected.classList.remove('selected');

        clickedCell.classList.add('selected');
        selectedDate = newSelectedDate;

        updateTaskSectionForDate(selectedDate);
    }

    // Actualizar sección de tareas para la fecha seleccionada
    function updateTaskSectionForDate(dateString) {
        const dateObj = new Date(dateString + 'T00:00:00'); // Interpretar como local
        selectedDateDisplay.textContent = dateObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        taskInput.disabled = false;
        addTaskBtn.disabled = false;
        taskInput.placeholder = `Nueva tarea para el ${dateObj.toLocaleDateString('es-ES', { day: 'numeric', month:'short' })}...`;
        renderTasks(dateString);
    }

    // Renderizar listas de tareas (activas y completadas) para la fecha dada
    function renderTasks(dateString) {
        activeTasksList.innerHTML = '';
        completedTasksList.innerHTML = '';

        if (!dateString) return;

        const { active, completed } = getTasksForDate(dateString);

        active.forEach((taskText, index) => {
            const li = createTaskElement(taskText, dateString, index, false);
            activeTasksList.appendChild(li);
        });

        completed.forEach((taskText, index) => {
            const li = createTaskElement(taskText, dateString, index, true);
            completedTasksList.appendChild(li);
        });
    }
    // Exponer al objeto window
    window.renderTasks = renderTasks;

    // Crear elemento <li> para una tarea (CON BOTONES EDITAR/ELIMINAR)
    function createTaskElement(taskText, dateString, index, isCompleted) {
        const li = document.createElement('li');
        li.dataset.date = dateString;
        li.dataset.index = index;
        li.dataset.completed = isCompleted;
        
        // Cargar detalles adicionales desde localStorage
        const listType = isCompleted ? 'completed' : 'active';
        const taskKey = `task_details_${dateString}_${index}`;
        const storedDetails = localStorage.getItem(taskKey);
        
        if (storedDetails) {
            try {
                const details = JSON.parse(storedDetails);
                li.dataset.taskTime = details.time || '';
                li.dataset.taskDescription = details.description || '';
            } catch (e) {
                console.error('Error al parsear detalles de tarea:', e);
            }
        }

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isCompleted;
        checkbox.addEventListener('change', toggleTaskCompletion);

        const span = document.createElement('span');
        span.textContent = taskText;

        // Contenedor para los botones de acción
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('task-actions');

        // Botón Editar
        const editButton = document.createElement('button');
        editButton.classList.add('task-action-btn', 'edit-btn');
        editButton.innerHTML = '✏️'; // Icono de lápiz
        editButton.title = "Editar tarea";
        editButton.addEventListener('click', handleEditTask);

        // Botón Ver Detalles (ojo)
        const viewButton = document.createElement('button');
        viewButton.classList.add('task-action-btn', 'view-btn');
        viewButton.innerHTML = '<i class="fas fa-eye"></i>'; // Icono de ojo
        viewButton.title = "Ver detalles";
        viewButton.addEventListener('click', function(event) {
            event.stopPropagation();
            if (typeof window.showTaskDetails === 'function') {
                window.showTaskDetails(this);
            }
        });

        // Botón Eliminar
        const deleteButton = document.createElement('button');
        deleteButton.classList.add('task-action-btn', 'delete-btn');
        deleteButton.innerHTML = '🗑️'; // Icono de tacho
        deleteButton.title = "Eliminar tarea";
        deleteButton.addEventListener('click', handleDeleteTask);

        // Añadir elementos al li
        li.appendChild(checkbox);
        li.appendChild(span);
        actionsDiv.appendChild(editButton);
        actionsDiv.appendChild(viewButton); // Añadir botón de ojo entre editar y eliminar
        actionsDiv.appendChild(deleteButton);
        li.appendChild(actionsDiv); // Añadir el div de acciones al final

        return li;
    }

    // Manejar el envío del formulario para añadir tarea
    function handleAddTask(event) {
        event.preventDefault();
        if (!selectedDate) return;

        const taskText = taskInput.value.trim();
        if (taskText === '') return;

        // Asegurar estructura en tasks
        if (!tasks[category]) tasks[category] = {};
        if (!tasks[category][selectedDate]) tasks[category][selectedDate] = { active: [], completed: [] };

        tasks[category][selectedDate].active.push(taskText);
        taskInput.value = '';

        saveTasks();
        renderTasks(selectedDate);
        updateCalendarDayIndicator(selectedDate);
    }
    // Exponer al objeto window
    window.handleAddTask = handleAddTask;

    // Cambiar estado de completado de una tarea
    function toggleTaskCompletion(event) {
        const checkbox = event.target;
        const li = checkbox.closest('li');
        const date = li.dataset.date;
        const index = parseInt(li.dataset.index, 10);
        const isCurrentlyCompleted = li.dataset.completed === 'true';

        const tasksForDate = getTasksForDate(date); // Ya nos aseguramos que exista
        let taskText;

        if (isCurrentlyCompleted) {
            taskText = tasksForDate.completed.splice(index, 1)[0];
            tasksForDate.active.push(taskText);
        } else {
            taskText = tasksForDate.active.splice(index, 1)[0];
            tasksForDate.completed.push(taskText);
        }

        saveTasks();
        renderTasks(date);
        updateCalendarDayIndicator(date);
    }

    // --- NUEVAS FUNCIONES PARA EDITAR Y ELIMINAR ---

    // Manejar clic en botón Editar
    function handleEditTask(event) {
        const button = event.target.closest('button'); // Asegura que capturemos el botón
        const li = button.closest('li');
        const date = li.dataset.date;
        const index = parseInt(li.dataset.index, 10);
        const isCompleted = li.dataset.completed === 'true';
        const listType = isCompleted ? 'completed' : 'active';

        // Asegurarse que la ruta exista antes de accederla
        if (!tasks[category]?.[date]?.[listType]?.[index]) {
            console.error("Error: No se encontró la tarea para editar.");
            return;
        }

        const currentTaskText = tasks[category][date][listType][index];

        const newTaskText = prompt("Edita tu tarea:", currentTaskText);

        if (newTaskText !== null && newTaskText.trim() !== '' && newTaskText.trim() !== currentTaskText) {
            tasks[category][date][listType][index] = newTaskText.trim();
            saveTasks();
            renderTasks(date);
        } else if (newTaskText !== null && newTaskText.trim() === '') {
            alert("La tarea no puede estar vacía. No se guardaron cambios.");
        }
    }

    // Manejar clic en botón Eliminar
    function handleDeleteTask(event) {
        const button = event.target.closest('button'); // Asegura que capturemos el botón
        const li = button.closest('li');
        const date = li.dataset.date;
        const index = parseInt(li.dataset.index, 10);
        const isCompleted = li.dataset.completed === 'true';
        const listType = isCompleted ? 'completed' : 'active';

         // Asegurarse que la ruta exista antes de accederla
         if (!tasks[category]?.[date]?.[listType]?.[index]) {
            console.error("Error: No se encontró la tarea para eliminar.");
            return;
        }

        const taskTextToDelete = tasks[category][date][listType][index];

        if (confirm(`¿Estás segura de que quieres eliminar esta tarea?\n\n"${taskTextToDelete}"`)) {
            tasks[category][date][listType].splice(index, 1);
            saveTasks();
            renderTasks(date);
            updateCalendarDayIndicator(date);
        }
    }

    // Actualizar el indicador visual (punto) en el día del calendario
    function updateCalendarDayIndicator(dateString) {
        if (!dateString) return;
        
        const dayCell = calendarGrid.querySelector(`.day[data-date="${dateString}"]`);
        if (!dayCell) return;
        
        const dayTasks = getTasksForDate(dateString);
        if (dayTasks.active.length > 0) {
            dayCell.classList.add('has-tasks');
        } else {
            dayCell.classList.remove('has-tasks');
        }
    }
    // Exponer al objeto window
    window.updateCalendarDayIndicator = updateCalendarDayIndicator;

    // --- Event Listeners ---
    if (prevMonthButton) {
        prevMonthButton.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendar(currentMonth, currentYear);
        });
    }

    if (nextMonthButton) {
        nextMonthButton.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendar(currentMonth, currentYear);
        });
    }

    if (taskForm) {
        taskForm.addEventListener('submit', handleAddTask);
    }

    // --- Inicialización ---
    if (category && calendarGrid) {
        renderCalendar(currentMonth, currentYear);
        const todayString = formatDate(new Date());
        const todayCell = calendarGrid.querySelector(`.day[data-date="${todayString}"]`);
         if (todayCell && !selectedDate) { // Selecciona hoy solo si no hay ya una fecha seleccionada (raro, pero seguro)
            todayCell.click();
         } else if (!selectedDate) { // Si hoy no está visible y no hay nada seleccionado
             selectedDateDisplay.textContent = "Selecciona una fecha del calendario";
             taskInput.disabled = true;
             addTaskBtn.disabled = true;
         } else if (selectedDate) {
             // Si por alguna razón ya hubiera una fecha seleccionada (ej. recarga), la renderizamos
             updateTaskSectionForDate(selectedDate);
             // Y aseguramos que el día esté marcado en el calendario actual
             const selectedDayCell = calendarGrid.querySelector(`.day[data-date="${selectedDate}"]`);
             if (selectedDayCell) selectedDayCell.classList.add('selected');
         }
    } else if (!category && !window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
        // Muestra error solo si no estamos en index.html y falta la categoría
        console.error("Error: No se encontró el atributo 'data-category' en el body. Asegúrate de que esté presente en escuela.html, gym.html y varios.html.");
    }

});