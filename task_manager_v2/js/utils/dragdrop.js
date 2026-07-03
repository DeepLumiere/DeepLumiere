// ═══════════════════════════════════════════════════
// TaskFlow v2 — Drag and Drop Utility
// ═══════════════════════════════════════════════════

import { updateTask } from '../db/tasks.js';

export const DragDrop = {
  init(boardContainer) {
    this.board = boardContainer;
    this.draggedCard = null;
    this.placeholder = document.createElement('div');
    this.placeholder.className = 'drop-indicator';

    this.bindEvents();
  },

  bindEvents() {
    this.board.addEventListener('dragstart', this.handleDragStart.bind(this));
    this.board.addEventListener('dragend', this.handleDragEnd.bind(this));
    this.board.addEventListener('dragover', this.handleDragOver.bind(this));
    this.board.addEventListener('dragenter', this.handleDragEnter.bind(this));
    this.board.addEventListener('dragleave', this.handleDragLeave.bind(this));
    this.board.addEventListener('drop', this.handleDrop.bind(this));
  },

  handleDragStart(e) {
    const card = e.target.closest('.task-card');
    if (!card) return;

    this.draggedCard = card;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.dataset.id);
    
    // Slight delay so the ghost image doesn't look empty
    setTimeout(() => {
      card.classList.add('dragging');
    }, 0);
  },

  handleDragEnd(e) {
    if (!this.draggedCard) return;
    this.draggedCard.classList.remove('dragging');
    this.draggedCard = null;
    
    this.board.querySelectorAll('.kanban-column').forEach(col => {
      col.classList.remove('drag-over');
    });
    
    if (this.placeholder.parentNode) {
      this.placeholder.parentNode.removeChild(this.placeholder);
    }
  },

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const column = e.target.closest('.kanban-column');
    if (!column || !this.draggedCard) return;
    
    const cardsList = column.querySelector('.column-cards');
    
    // Find closest card to insert placeholder before/after
    const closest = this.getClosestCard(cardsList, e.clientY);
    if (closest) {
      cardsList.insertBefore(this.placeholder, closest);
    } else {
      cardsList.appendChild(this.placeholder);
    }
    
    this.placeholder.classList.add('visible');
  },

  handleDragEnter(e) {
    e.preventDefault();
    const column = e.target.closest('.kanban-column');
    if (column) {
      column.classList.add('drag-over');
    }
  },

  handleDragLeave(e) {
    const column = e.target.closest('.kanban-column');
    // We only remove drag-over if we actually leave the column bounds
    if (column && !column.contains(e.relatedTarget)) {
      column.classList.remove('drag-over');
    }
  },

  async handleDrop(e) {
    e.preventDefault();
    const column = e.target.closest('.kanban-column');
    if (!column || !this.draggedCard) return;
    
    column.classList.remove('drag-over');
    const newStatus = column.dataset.status;
    const taskId = this.draggedCard.dataset.id;
    
    if (!taskId || !newStatus) return;

    // Move in DOM immediately for snappy UX
    if (this.placeholder.parentNode) {
      this.placeholder.parentNode.insertBefore(this.draggedCard, this.placeholder);
      this.placeholder.parentNode.removeChild(this.placeholder);
    }

    // Update DB
    try {
      await updateTask(taskId, { status: newStatus });
    } catch (err) {
      console.error('Drop failed:', err);
      // In a real app we'd revert the DOM if DB fails
    }
  },

  getClosestCard(container, y) {
    const cards = [...container.querySelectorAll('.task-card:not(.dragging)')];
    
    return cards.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
};
