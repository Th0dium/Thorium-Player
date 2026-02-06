const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

const SOURCE_IMAGE = 'deb3d85c-4dc2-4409-9dfa-25d7cd05151d.jpg';
const ANDROID_RES_DIR = 'android/app/src/main/res';
const IOS_ICON_DIR = 'ios/TempThorium/Images.xcassets/AppIcon.appiconset';

const androidIcons = [
    { dir: 'mipmap-mdpi', size: 48 },
    { dir: 'mipmap-hdpi', size: 72 },
    { dir: 'mipmap-xhdpi', size: 96 },
    { dir: 'mipmap-xxhdpi', size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 },
];

const iosIcons = [
    { name: 'icon-20@2x.png', size: 40 },
    { name: 'icon-20@3x.png', size: 60 },
    { name: 'icon-29@2x.png', size: 58 },
    { name: 'icon-29@3x.png', size: 87 },
    { name: 'icon-40@2x.png', size: 80 },
    { name: 'icon-40@3x.png', size: 120 },
    { name: 'icon-60@2x.png', size: 120 },
    { name: 'icon-60@3x.png', size: 180 },
    { name: 'icon-1024.png', size: 1024 },
];

async function generateIcons() {
    console.log('Loading source image...');
    const image = await Jimp.read(SOURCE_IMAGE);

    // Android Icons
    console.log('Generating Android icons...');
    for (const icon of androidIcons) {
        const destDir = path.join(ANDROID_RES_DIR, icon.dir);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        // Square icon
        const squareIcon = image.clone().resize({ w: icon.size, h: icon.size });
        await squareIcon.write(path.join(destDir, 'ic_launcher.png'));

        // Round icon
        const roundIcon = image.clone().resize({ w: icon.size, h: icon.size });
        roundIcon.circle();
        await roundIcon.write(path.join(destDir, 'ic_launcher_round.png'));
        
        console.log(`Generated Android ${icon.dir} (${icon.size}x${icon.size})`);
    }

    // iOS Icons
    console.log('Generating iOS icons...');
    for (const icon of iosIcons) {
        const iosIcon = image.clone().resize({ w: icon.size, h: icon.size });
        await iosIcon.write(path.join(IOS_ICON_DIR, icon.name));
        console.log(`Generated iOS ${icon.name} (${icon.size}x${icon.size})`);
    }

    // Update iOS Contents.json
    console.log('Updating iOS Contents.json...');
    const contents = {
        images: [
            { idiom: 'iphone', scale: '2x', size: '20x20', filename: 'icon-20@2x.png' },
            { idiom: 'iphone', scale: '3x', size: '20x20', filename: 'icon-20@3x.png' },
            { idiom: 'iphone', scale: '2x', size: '29x29', filename: 'icon-29@2x.png' },
            { idiom: 'iphone', scale: '3x', size: '29x29', filename: 'icon-29@3x.png' },
            { idiom: 'iphone', scale: '2x', size: '40x40', filename: 'icon-40@2x.png' },
            { idiom: 'iphone', scale: '3x', size: '40x40', filename: 'icon-40@3x.png' },
            { idiom: 'iphone', scale: '2x', size: '60x60', filename: 'icon-60@2x.png' },
            { idiom: 'iphone', scale: '3x', size: '60x60', filename: 'icon-60@3x.png' },
            { idiom: 'ios-marketing', scale: '1x', size: '1024x1024', filename: 'icon-1024.png' },
        ],
        info: { author: 'xcode', version: 1 }
    };
    fs.writeFileSync(path.join(IOS_ICON_DIR, 'Contents.json'), JSON.stringify(contents, null, 2));

    console.log('Icon generation complete!');
}

generateIcons().catch(err => {
    console.error('Error generating icons:', err);
});
