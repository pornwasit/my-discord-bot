const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// สร้าง Express server เพื่อให้ Render.com ping ได้
const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/', (req, res) => {
    res.status(200).send('Bot is running! 🤖');
});

// เริ่ม HTTP server
app.listen(PORT, () => {
    console.log(`HTTP Server running on port ${PORT}`);
});

// สร้าง Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Event เมื่อบอทออนไลน์
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} is online!`);
    
    // ตั้งสถานะของบอท
    client.user.setActivity('กำลังทำงานบน Render.com', { 
        type: 'WATCHING' 
    });
});

// Event เมื่อได้รับข้อความ
client.on('messageCreate', (message) => {
    // ไม่ตอบกลับข้อความของบอทอื่น
    if (message.author.bot) return;
    
    // คำสั่ง ping
    if (message.content.toLowerCase() === '!ping') {
        message.reply('🏓 Pong!');
    }
    
    // คำสั่งสถานะ
    if (message.content.toLowerCase() === '!status') {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        message.reply(`🟢 บอทออนไลน์มาแล้ว: ${hours}ชม ${minutes}นาที ${seconds}วินาที`);
    }
});

// จัดการ Error
client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// เข้าสู่ระบบด้วย Token
client.login(process.env.DISCORD_TOKEN);
