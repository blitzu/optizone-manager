
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log("Inițializare aplicație...");

const rootElement = document.getElementById("root");
console.log("Element root găsit:", rootElement);

if (rootElement) {
  try {
    console.log("Se încearcă randarea aplicației...");
    const root = createRoot(rootElement);
    root.render(<App />);
    console.log("Aplicația a fost randată cu succes!");
  } catch (error) {
    console.error("Eroare la randarea aplicației:", error);
  }
} else {
  console.error("Elementul 'root' nu a fost găsit în DOM!");
}
