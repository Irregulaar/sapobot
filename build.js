const fs = require('fs');
const path = require('path');

// Función para copiar directorios recursivamente
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Limpiar y crear directorio deploy
const deployDir = path.join(__dirname, 'deploy');
if (fs.existsSync(deployDir)) {
  fs.rmSync(deployDir, { recursive: true, force: true });
}
fs.mkdirSync(deployDir, { recursive: true });

// Copiar archivos necesarios
console.log('Copying files to deploy directory...');

// Copiar recursos
copyDir(path.join(__dirname, 'resources', 'img'), path.join(deployDir, 'img'));
copyDir(path.join(__dirname, 'resources', 'media'), path.join(deployDir, 'media'));

// Copiar archivos minificados
copyDir(path.join(__dirname, 'src', 'deploy'), path.join(deployDir));

// Copiar index.html
const indexHtml = path.join(__dirname, 'www', 'deploy', 'index.html');
if (fs.existsSync(indexHtml)) {
  fs.copyFileSync(indexHtml, path.join(deployDir, 'index.html'));
} else {
  // Si no existe, copiar el de develop
  const developHtml = path.join(__dirname, 'www', 'develop', 'index.html');
  if (fs.existsSync(developHtml)) {
    fs.copyFileSync(developHtml, path.join(deployDir, 'index.html'));
  }
}

console.log('Build completed!');

