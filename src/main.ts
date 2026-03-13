import { UIController } from './modules/UIController';
import './styles/main.css';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('mapCanvas') as HTMLCanvasElement;
  const tooltip = document.getElementById('tooltip') as HTMLElement;

  if (!canvas || !tooltip) {
    console.error('Required DOM elements not found');
    return;
  }

  const controller = new UIController(canvas, tooltip);
  await controller.initialize();
});
