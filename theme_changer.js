const fs = require('fs');
const path = require('path');

const colorMap = {
  '#FDFBF7': '#FFFFFF',
  '#1E1B18': '#000000',
  '#ECE5D9': '#E5E5E5',
  '#A89984': '#757575',
  '#62594D': '#4A4A4A',
  '#BFA590': '#333333',
  '#F1ebd9': '#F5F5F5',
  '#F5EFE4': '#FAFAFA',
  '#322C27': '#333333'
};

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.css') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walkDir('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // Also need to handle case-insensitive replacements
  for (const [oldColor, newColor] of Object.entries(colorMap)) {
    const regex = new RegExp(oldColor, 'gi');
    content = content.replace(regex, newColor);
  }

  // Specific grid layout fix in Catalog.tsx
  if (file.endsWith('Catalog.tsx')) {
    content = content.replace(
      /className={`grid gap-5 sm:gap-6 \${[\s\S]*?}`}/g,
      "className={`grid gap-5 sm:gap-6 ${layoutColumns === 1 ? 'grid-cols-1 max-w-md sm:max-w-xl mx-auto' : layoutColumns === 2 ? 'grid-cols-2' : layoutColumns === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}"
    );
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
