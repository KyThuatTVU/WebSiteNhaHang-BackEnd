// Script to create image variants (thumbnail, medium, high) from original images
const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, '../images');

// Get all image files
const imageFiles = fs.readdirSync(imagesDir).filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
});

console.log(`Found ${imageFiles.length} image files`);

imageFiles.forEach(file => {
    const filePath = path.join(imagesDir, file);
    const ext = path.extname(file);
    const baseName = path.basename(file, ext);
    
    // Skip if it's already a variant
    if (baseName.includes('_thumb') || baseName.includes('_med') || baseName.includes('_high')) {
        return;
    }
    
    // Create variants
    const variants = ['_thumb', '_med', '_high'];
    
    variants.forEach(variant => {
        const variantFile = `${baseName}${variant}${ext}`;
        const variantPath = path.join(imagesDir, variantFile);
        
        // Only create if doesn't exist
        if (!fs.existsSync(variantPath)) {
            try {
                fs.copyFileSync(filePath, variantPath);
                console.log(`✅ Created: ${variantFile}`);
            } catch (error) {
                console.error(`❌ Error creating ${variantFile}:`, error.message);
            }
        } else {
            console.log(`⏭️  Skipped: ${variantFile} (already exists)`);
        }
    });
});

console.log('\n🎉 Image variants creation completed!');
