// DOMContentLoaded listener for add-task init.
window.addEventListener("DOMContentLoaded", handleAddTaskReady);

/**
 * Starts the add task init once the page is ready.
 */
function handleAddTaskReady() {
  withPageReady(runAddTaskInit);
}

/**
 * Initialises the add task form and returns to the board on close.
 * @returns {Promise<void>}
 */
async function runAddTaskInit() {
  await initAddTaskForm({
    onClose: () => {
      window.location.href = "board.html";
    },
  });
}
