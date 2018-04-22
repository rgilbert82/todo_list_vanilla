// ============================================================================
//  Todo List App
// ============================================================================

var MONTHS = {
  '01': 'Jan',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Apr',
  '05': 'May',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Aug',
  '09': 'Sep',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Dec'
};

var head = document.getElementById('head');
var addTodo = document.getElementById('add_todo');
var allTodos = document.getElementById('all_todos');
var allTodosUL = allTodos.getElementsByTagName('ul')[0];
var allTodosHeader = allTodos.getElementsByTagName('h2')[0].getElementsByTagName('a')[0];
var allTodosHeaderTotal = allTodos.getElementsByClassName('sidebar_header_total')[0];
var completed = document.getElementById('completed');
var completedUL = completed.getElementsByTagName('ul')[0];
var completedHeader = completed.getElementsByTagName('h2')[0].getElementsByTagName('a')[0];
var completedHeaderTotal = completed.getElementsByClassName('sidebar_header_total')[0];
var todosListUL = document.getElementById('col2').getElementsByTagName('ul')[0];
var modals = document.getElementById('modal_container');

// ============================================================================
//  Model
// ============================================================================

var TodoList = {
  todos: [],
  todoID: 0,
  incrementTodoID: function() {
    this.todoID++;
  },
  resetTodoID: function() {
    if (this.todos.length === 0) {
      this.todoID = 0;
    }
  },
  getFormObject: function(fields) {
    var obj = {};

    for (var i = 0; i < fields.length; i++) {
      if (fields[i].type !== 'submit' &&
         !(fields[i].name === 'is_complete' && !fields[i].checked)) {
        obj[fields[i].name] = fields[i].value;
      }
    }

    this.addTodoID(obj);
    this.addCompletedStatus(obj);
    this.addFormattedDate(obj);

    return obj;
  },
  addCompletedStatus: function(dataObj) {
    if (dataObj.is_complete) {
      dataObj.is_complete = true;
    }
  },
  addTodoID: function(dataObj) {
    if (!dataObj.id) {
      this.incrementTodoID();
      dataObj.id = this.todoID;
    } else if (typeof dataObj.id === 'string') {
      dataObj.id = Number(dataObj.id);
    }
  },
  addFormattedDate: function(dataObj) {
    if (dataObj.month && dataObj.year) {
      dataObj.date = dataObj.month + "/" + dataObj.year.slice(2);
    } else {
      dataObj.date = 'No Due Date';
    }
  },
  writeTodo: function(formElements) {
    var data = this.getFormObject(formElements);

    this.todos = this.todos.filter(function(todo) {
      return todo.id !== data.id;
    });

    this.todos.push(data);
  },
  deleteTodo: function(todoID) {
    this.todos = this.todos.filter(function(todo) {
      return todo.id !== todoID;
    });
  },
  changeCompletedStatus: function(todoID) {
    this.todos.forEach(function(todo) {
      if (todo.id === todoID && todo.is_complete) {
        delete todo.is_complete;
      } else if (todo.id === todoID && !todo.is_complete){
        todo.is_complete = true;
      }
    });
  },
};

// ============================================================================
//  Controller
// ============================================================================

var TodoApp = {
  instantiateTodoList: function() {
    this.todoList = Object.create(TodoList)
  },
  instantiateViews: function() {
    this.primaryColumnView = Object.create(PrimaryColumnView).init(this);
    this.todosSidebarView = Object.create(TodosSidebarView).init(this);
  },
  storeTodoID: function() {
    localStorage.setItem('todoID', JSON.stringify(this.todoList.todoID));
  },
  storeTodos: function() {
    localStorage.setItem('todos', JSON.stringify(this.todoList.todos));
  },
  storeAll: function() {
    this.todoList.resetTodoID();
    this.storeTodoID();
    this.storeTodos();
  },
  setupLocalStorage: function() {
    localStorage.todoID || this.storeTodoID();
    localStorage.todos  || this.storeTodos();

    this.todoList.todoID =  JSON.parse(localStorage.todoID);
    this.todoList.todos =   JSON.parse(localStorage.todos);
  },
  submitForm: function(formElements) {
    var todoList = this.todoList;

    todoList.writeTodo(formElements);
    this.storeAll();
  },
  init: function() {
    this.instantiateTodoList();
    this.setupLocalStorage();
    this.instantiateViews(app);
    allTodosHeader.click();
  },
};

// ============================================================================
//  Shared View Functions
// ============================================================================

function orderByNoDueDate(todos) {
  return todos.sort(function(a, b) {
    if(a.date === 'No Due Date') {
      return -1;
    } else if (b.date === 'No Due Date') {
      return 1;
    } else {
      return 0;
    }
  });
}

function orderByDate(datesTotals) {
  return orderByNoDueDate(datesTotals.sort(function(a, b) {
    return a.date.split('/').reverse().join('') > b.date.split('/').reverse().join('');
  }));
}

function orderByDay(todos) {
  return orderByNoDueDate(todos.sort(function(a, b) {
    return a.year + a.month + a.day > b.year + b.month + b.day;
  }));
}

function orderByDayCompleted(todos) {
  var ordered = orderByDay(todos);
  var completed = ordered.filter(function(todo) { return todo.is_complete });
  var notCompleted = ordered.filter(function(todo) { return !todo.is_complete });

  return notCompleted.concat(completed);
}

// ============================================================================
//  Views
// ============================================================================

var TodosSidebarView = {
  createTemplates: function() {
    this.sidebarHeaderTemplate = Handlebars.compile(document.getElementById('sidebar_header_template').innerHTML);
    this.allTodosSidebarTemplate = Handlebars.compile(document.getElementById('all_todos_sidebar_template').innerHTML);
    this.allTodosSidebarPartial = Handlebars.compile(document.getElementById('all_todos_sidebar_partial').innerHTML);
    this.completedSidebarTemplate = Handlebars.compile(document.getElementById('completed_sidebar_template').innerHTML);
    this.completedSidebarPartial = Handlebars.compile(document.getElementById('completed_sidebar_partial').innerHTML);

    Handlebars.registerPartial('all_todos_sidebar_partial', document.getElementById('all_todos_sidebar_partial').innerHTML);
    Handlebars.registerPartial('completed_sidebar_partial', document.getElementById('completed_sidebar_partial').innerHTML);
  },
  getViewModel: function() {
    var allTodos = 0;
    var allCompleted = 0;
    var datesTotals = this.getDatesTotals();

    datesTotals.forEach(function(dt) {
      allTodos += dt.totalNumber;
      allCompleted += dt.completedNumber;
    });

    this.viewModel = { allTodos: allTodos, allCompleted: allCompleted, rows: datesTotals };
  },
  getDatesTotals: function() {
    var datesTotals = [];

    this.app.todoList.todos.forEach(function(d) {
      var findDate = datesTotals.map(function(dt) {
        return dt.date === d.date;
      });
      var index = findDate.indexOf(true);
      var completed = d.is_complete ? 1 : 0;

      if (index === -1) {
        datesTotals.push({ date: d.date, totalNumber: 1, completedNumber: completed });
      } else {
        datesTotals[index].totalNumber++;
        datesTotals[index].completedNumber += completed;
      }
    });

    datesTotals.map(function(dt) {
      if (dt.totalNumber === dt.completedNumber) {
        dt.allCompleted = true;
      } else {
        dt.allCompleted = false;
      }
    });

    return orderByDate(datesTotals);
  },
  populateAllTodosList: function() {
    allTodosHeaderTotal.innerHTML = this.sidebarHeaderTemplate({ total: this.viewModel.allTodos });
    allTodosUL.innerHTML = this.allTodosSidebarTemplate({ month: this.viewModel.rows });
  },
  populateCompletedList: function() {
    var completedDatesTotals = this.viewModel.rows.filter(function(dt) { return dt.completedNumber > 0 });

    if (this.viewModel.allTodos > 0 && this.viewModel.allTodos === this.viewModel.allCompleted) {
      completedHeader.setAttribute('class', 'strikethrough');
    } else {
      completedHeader.removeAttribute('class', 'strikethrough');
    }

    completedHeaderTotal.innerHTML = this.sidebarHeaderTemplate({ total: this.viewModel.allCompleted });
    completedUL.innerHTML = this.completedSidebarTemplate({ month: completedDatesTotals });
  },
  populateSidebarLists: function() {
    this.getViewModel();
    this.populateAllTodosList();
    this.populateCompletedList();
  },
  highlightSidebar: function(target) {
    var highlighted = document.getElementsByClassName('current_page')[0];

    if (highlighted) {
      highlighted.removeAttribute('class', 'current_page');
    }

    target.setAttribute('class', 'current_page');
  },
  refreshPage: function() {
    var highlightedAttr = document.getElementsByClassName('current_page')[0].getAttribute('data-highlight');
    var sidebarView = this.app.sidebarView;
    var selectedDateElement;

    this.populateSidebarLists();

    selectedDateElement = document.querySelectorAll('[data-highlight="' + highlightedAttr + '"]');

    if (selectedDateElement.length > 0) {
      selectedDateElement[0].getElementsByTagName('a')[0].click();
    } else {
      allTodosHeader.click();
    }
  },
  eventListeners: function() {
    var primaryColumnView = this.app.primaryColumnView;

    completedHeader.addEventListener('click', primaryColumnView.populatePrimaryColumnByAllCompleted.bind(primaryColumnView));
    allTodosHeader.addEventListener('click', primaryColumnView.populatePrimaryColumnByAllTodos.bind(primaryColumnView));

    allTodosUL.addEventListener('click', function(e) {
      e.preventDefault();
      if (e.target.tagName === 'A') {
        primaryColumnView.populatePrimaryColumnByDateAll(e);
      }
    });

    completedUL.addEventListener('click', function(e) {
      e.preventDefault();
      if (e.target.tagName === 'A') {
        primaryColumnView.populatePrimaryColumnByDateCompleted(e);
      }
    });
  },
  init: function(app) {
    this.app = app;
    this.createTemplates();
    this.populateSidebarLists();
    this.eventListeners();

    return this;
  }
};


var PrimaryColumnView = {
  createTemplates: function() {
    this.modalTemplate = Handlebars.compile(document.getElementById('modal_template').innerHTML);
    this.primaryColumnHeaderTemplate = Handlebars.compile(document.getElementById('primary_column_header_template').innerHTML);
    this.primaryColumnTodoTemplate = Handlebars.compile(document.getElementById('primary_column_todo_template').innerHTML);
    this.primaryColumnTodoPartial = Handlebars.compile(document.getElementById('primary_column_todo_partial').innerHTML);

    Handlebars.registerPartial('primary_column_todo_partial', document.getElementById('primary_column_todo_partial').innerHTML);

    Handlebars.registerHelper('select_year', function(year, option) {
      return year === option ? ' selected' : '';
    });

    Handlebars.registerHelper('select_month', function(month, option) {
      return month === option ? ' selected' : '';
    });

    Handlebars.registerHelper('select_day', function(day, option) {
      return day === option ? ' selected' : '';
    });

    Handlebars.registerHelper('date_or_no_date', function(day, month, year) {
      if (day && month && year) {
        return day + ' ' + MONTHS[month] + ' ' + year;
      } else if (month && year) {
        return MONTHS[month] + ' ' + year;
      } else {
        return 'No Due Date';
      }
    });
  },
  openAddTodoModal: function(e) {
    e.preventDefault();
    modals.innerHTML = this.modalTemplate({});
  },
  openEditTodoModal: function(id) {
    var todoObj = this.app.todoList.todos.filter(function(todo) { return todo.id === id})[0];
    modals.innerHTML = this.modalTemplate(todoObj);
  },
  closeModal: function() {
    var modal = document.getElementById('modal');
    modal.remove();
  },
  deleteTodo: function(id) {
    var todoList = this.app.todoList;

    todoList.deleteTodo(id);
    this.app.storeAll();
    this.app.todosSidebarView.refreshPage();
  },
  changeCheckboxText: function(checkbox) {
    if (checkbox.checked) {
      checkbox.nextElementSibling.textContent = 'Mark As Incomplete';
    } else {
      checkbox.nextElementSibling.textContent = 'Mark As Complete';
    }
  },
  changeCompletedStatusWithCheckbox: function(id) {
    var todoList = this.app.todoList;

    todoList.changeCompletedStatus(id);
    this.app.storeAll();
    this.app.todosSidebarView.refreshPage();
  },
  delegatePrimaryColumnTodoEvents: function(e) {
    var clickedElement = e.target;
    var id = Number(e.target.closest('li').getAttribute('data-id'));

    if (clickedElement.className === 'edit_todo_span') {
      e.preventDefault();
      this.openEditTodoModal(id);
    } else if (clickedElement.className === 'trashcan') {
      e.preventDefault();
      this.deleteTodo(id);
    } else if (clickedElement.className.match(/todo_checkbox/)) {
      this.changeCompletedStatusWithCheckbox(id);
    }
  },
  populatePrimaryColumnByDateAll: function(e) {
    var selectedDate = e.target.textContent;
    var todoList = this.app.todoList;
    var sidebarView = this.app.todosSidebarView;
    var rows = sidebarView.viewModel.rows;
    var todosForDate = orderByDayCompleted(todoList.todos.filter(function(d) {
      return d.date === selectedDate;
    }));
    var todosForDateTotal = rows.filter(function(dt) {
      return dt.date === selectedDate;
    })[0].totalNumber;
    var headerObj = { date: selectedDate, total: todosForDateTotal };

    sidebarView.highlightSidebar(e.target.closest('li'));
    this.renderPrimaryHeader(headerObj);
    this.populatePrimaryColumn(todosForDate);
  },
  populatePrimaryColumnByDateCompleted: function(e) {
    var selectedDate = e.target.textContent;
    var todoList = this.app.todoList;
    var sidebarView = this.app.todosSidebarView;
    var rows = sidebarView.viewModel.rows;
    var completedTodosForDate = orderByDayCompleted(todoList.todos.filter(function(d) {
      return d.date === selectedDate && d.is_complete;
    }));
    var completedTodosForDateTotal = rows.filter(function(dt) {
      return dt.date === selectedDate;
    })[0].completedNumber;
    var headerObj = { date: selectedDate, total: completedTodosForDateTotal };

    sidebarView.highlightSidebar(e.target.closest('li'));
    this.renderPrimaryHeader(headerObj);
    this.populatePrimaryColumn(completedTodosForDate);
  },
  populatePrimaryColumnByAllTodos: function(e) {
    var todoList = this.app.todoList;
    var sidebarView = this.app.todosSidebarView;
    var allTodos = orderByDayCompleted(todoList.todos);
    var headerObj = { date: 'All Todos', total: allTodos.length };

    e.preventDefault();

    sidebarView.highlightSidebar(e.target.closest('dl'));
    this.renderPrimaryHeader(headerObj);
    this.populatePrimaryColumn(allTodos);
  },
  populatePrimaryColumnByAllCompleted: function(e) {
    var todoList = this.app.todoList;
    var sidebarView = this.app.todosSidebarView;
    var allCompleted = orderByDayCompleted(todoList.todos.filter(function(todo) {
      return todo.is_complete;
    }));
    var headerObj = { date: 'All Completed Todos', total: allCompleted.length };

    e.preventDefault();

    sidebarView.highlightSidebar(e.target.closest('dl'));
    this.renderPrimaryHeader(headerObj);
    this.populatePrimaryColumn(allCompleted);
  },
  populatePrimaryColumn: function(todos) {
    todosListUL.innerHTML = this.primaryColumnTodoTemplate({ todo: todos });
  },
  renderPrimaryHeader: function(headerObj) {
    head.innerHTML = this.primaryColumnHeaderTemplate(headerObj);
  },
  eventListeners: function() {
    var todoList = this.app.todoList;
    var self = this;

    addTodo.addEventListener('click', this.openAddTodoModal.bind(this));
    todosListUL.addEventListener('click', this.delegatePrimaryColumnTodoEvents.bind(this));

    modals.addEventListener('click', function(e) {
      if (e.target.className === 'modal_layer') {
        self.closeModal();
      }
    });

    modals.addEventListener('change', function(e) {
      if (e.target.getAttribute('id') === 'is_complete') {
        self.changeCheckboxText(e.target);
      }
    });

    modals.addEventListener('submit', function(e) {
      var formElements = e.target.elements;

      e.preventDefault();

      self.app.submitForm(formElements);
      self.closeModal();
      self.app.todosSidebarView.refreshPage();
    });
  },
  init: function(app) {
    this.app = app;
    this.createTemplates();
    this.eventListeners();

    return this;
  }
};


var app = Object.create(TodoApp);
app.init();
