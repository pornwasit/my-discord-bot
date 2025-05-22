const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// สร้าง Express server เพื่อไม่ให้ Render ทำให้ sleep
const app = express();
const PORT = process.env.PORT || 3000;

// สร้าง Discord Client
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ] 
});

// ===== EXPRESS SERVER SETUP (สำคัญสำหรับ Render) =====
app.get('/', (req, res) => {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    res.json({
        status: 'Bot is running! 🤖',
        uptime: `${hours}h ${minutes}m ${seconds}s`,
        botStatus: client.user ? `${client.user.username} is online` : 'Bot is starting...',
        servers: client.guilds ? client.guilds.cache.size : 0,
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        bot: client.user ? 'online' : 'offline',
        timestamp: new Date().toISOString()
    });
});

app.get('/ping', (req, res) => {
    res.json({ 
        message: 'pong',
        latency: client.ws.ping || 'N/A',
        timestamp: new Date().toISOString()
    });
});

// เริ่มต้น Express server
app.listen(PORT, () => {
    console.log(`🌐 Express server running on port ${PORT}`);
    console.log(`📡 Health check available at: http://localhost:${PORT}/health`);
});

// ===== KEEP ALIVE SYSTEM =====
function keepAlive() {
    const appUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    
    setInterval(async () => {
        try {
            const response = await fetch(`${appUrl}/health`);
            const data = await response.json();
            console.log(`🔄 Keep-alive ping: ${data.status} at ${new Date().toLocaleTimeString('th-TH')}`);
        } catch (error) {
            console.log(`❌ Keep-alive ping failed: ${error.message}`);
        }
    }, 14 * 60 * 1000); // Ping ทุก 14 นาที
}

// ===== DISCORD BOT CODE =====
// เมื่อบอทออนไลน์
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} is online!`);
    console.log(`📊 Serving ${client.guilds.cache.size} servers`);
    
    // ตั้งสถานะของบอท
    client.user.setActivity('พิมพ์ !help สำหรับความช่วยเหลือ | Hosted on Render', { 
        type: 'WATCHING' 
    });
    
    // เริ่ม keep-alive system หลังจากบอทออนไลน์
    keepAlive();
    console.log('🔄 Keep-alive system started');
});

// จัดการข้อความ
client.on('messageCreate', message => {
    // ไม่ตอบบอทอื่นๆ
    if (message.author.bot) return;
    
    const content = message.content.toLowerCase();
    
    // คำสั่งต่างๆ
    if (content === '!hello' || content === '!hi') {
        message.reply('🙏 สวัสดีครับ! ยินดีที่ได้พบกับคุณ');
    }
    
    else if (content === '!help') {
        const helpEmbed = {
            color: 0x0099FF,
            title: '📋 คำสั่งที่ใช้ได้',
            description: 'รายการคำสั่งทั้งหมด:',
            fields: [
                {
                    name: '!hello, !hi',
                    value: 'ทักทายบอท',
                    inline: true
                },
                {
                    name: '!ping',
                    value: 'เช็ค ping ของบอท',
                    inline: true
                },
                {
                    name: '!uptime',
                    value: 'ดูเวลาที่บอทรันมา',
                    inline: true
                },
                {
                    name: '!time',
                    value: 'ดูเวลาปัจจุบัน',
                    inline: true
                },
                {
                    name: '!server',
                    value: 'ข้อมูลเซิร์ฟเวอร์',
                    inline: true
                },
                {
                    name: '!user',
                    value: 'ข้อมูลผู้ใช้',
                    inline: true
                },
                {
                    name: '!joke',
                    value: 'เล่าเรื่องตลก',
                    inline: true
                },
                {
                    name: '!status',
                    value: 'สถานะของบอท',
                    inline: true
                }
            ],
            timestamp: new Date(),
            footer: {
                text: 'Hosted on Render.com 🚀 | Keep-Alive System Active'
            }
        };
        message.reply({ embeds: [helpEmbed] });
    }
    
    else if (content === '!ping') {
        const sent = Date.now();
        message.reply('🏓 กำลังเช็ค ping...').then(sentMessage => {
            const timeDiff = Date.now() - sent;
            sentMessage.edit(`🏓 Pong! \`${timeDiff}ms\` | API Latency: \`${Math.round(client.ws.ping)}ms\``);
        });
    }
    
    else if (content === '!uptime') {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        let uptimeString = '';
        if (days > 0) uptimeString += `${days} วัน `;
        if (hours > 0) uptimeString += `${hours} ชั่วโมง `;
        if (minutes > 0) uptimeString += `${minutes} นาที `;
        uptimeString += `${seconds} วินาที`;
        
        message.reply(`⏰ บอทรันมาแล้ว: **${uptimeString}**\n🔄 Keep-Alive System: **Active**`);
    }
    
    else if (content === '!status') {
        const statusEmbed = {
            color: 0x00FF00,
            title: '📊 สถานะของบอท',
            fields: [
                {
                    name: '🤖 ชื่อบอท',
                    value: client.user.username,
                    inline: true
                },
                {
                    name: '🔗 สถานะ',
                    value: 'ออนไลน์ 🟢',
                    inline: true
                },
                {
                    name: '📡 Ping',
                    value: `${Math.round(client.ws.ping)}ms`,
                    inline: true
                },
                {
                    name: '🏠 เซิร์ฟเวอร์',
                    value: `${client.guilds.cache.size} เซิร์ฟเวอร์`,
                    inline: true
                },
                {
                    name: '👥 ผู้ใช้',
                    value: `${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)} คน`,
                    inline: true
                },
                {
                    name: '🚀 Host',
                    value: 'Render.com',
                    inline: true
                }
            ],
            timestamp: new Date(),
            footer: {
                text: 'ระบบ Keep-Alive ทำงานอยู่ 🔄'
            }
        };
        message.reply({ embeds: [statusEmbed] });
    }
    
    else if (content === '!time') {
        const now = new Date();
        const thaiTime = now.toLocaleString('th-TH', {
            timeZone: 'Asia/Bangkok',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        message.reply(`🕐 เวลาปัจจุบัน: **${thaiTime}**`);
    }
    
    else if (content === '!server') {
        const guild = message.guild;
        if (guild) {
            const serverEmbed = {
                color: 0x00FF00,
                title: `📊 ข้อมูลเซิร์ฟเวอร์: ${guild.name}`,
                thumbnail: {
                    url: guild.iconURL()
                },
                fields: [
                    {
                        name: '👥 สมาชิก',
                        value: `${guild.memberCount} คน`,
                        inline: true
                    },
                    {
                        name: '📅 สร้างเมื่อ',
                        value: guild.createdAt.toLocaleDateString('th-TH'),
                        inline: true
                    },
                    {
                        name: '👑 เจ้าของ',
                        value: `<@${guild.ownerId}>`,
                        inline: true
                    }
                ]
            };
            message.reply({ embeds: [serverEmbed] });
        }
    }
    
    else if (content === '!user') {
        const user = message.author;
        const member = message.member;
        
        const userEmbed = {
            color: 0xFF0000,
            title: `👤 ข้อมูลผู้ใช้`,
            thumbnail: {
                url: user.displayAvatarURL()
            },
            fields: [
                {
                    name: '📛 ชื่อ',
                    value: user.username,
                    inline: true
                },
                {
                    name: '🏷️ Tag',
                    value: user.tag,
                    inline: true
                },
                {
                    name: '🆔 ID',
                    value: user.id,
                    inline: true
                },
                {
                    name: '📅 สร้างบัญชีเมื่อ',
                    value: user.createdAt.toLocaleDateString('th-TH'),
                    inline: true
                }
            ]
        };
        
        if (member) {
            userEmbed.fields.push({
                name: '📥 เข้าร่วมเซิร์ฟเวอร์เมื่อ',
                value: member.joinedAt.toLocaleDateString('th-TH'),
                inline: true
            });
        }
        
        message.reply({ embeds: [userEmbed] });
    }
    
    else if (content === '!joke') {
        const jokes = [
            'ทำไมผีถึงไม่กิน KFC? เพราะกลัวพันเอก! 👻',
            'อะไรที่มี 4 ขา แต่เดินไม่ได้? โต๊ะ! 🪑',
            'ทำไมเสือถึงไม่เล่นการพนัน? เพราะกลัวเสียเสือ! 🐅',
            'อะไรที่ยิ่งล้างยิ่งสกปรก? น้ำ! 💧',
            'ทำไมช้างถึงไม่ใช้คอมพิวเตอร์? เพราะกลัวเมาส์! 🐘',
            'ทำไมปลาไม่เล่นบาส? เพราะกลัวแฟน(ปลา)! 🐟',
            'อะไรที่กินได้ แต่กัดไม่ได้? ข้าว! 🍚'
        ];
        
        const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
        message.reply(`😂 ${randomJoke}`);
    }
    
    // ตอบกลับข้อความที่มีคำว่า "บอท"
    else if (content.includes('บอท')) {
        const responses = [
            'เรียกผมไหมครับ? 🤖',
            'มีอะไรให้ช่วยไหมครับ? 😊',
            'ผมอยู่นี่แล้วครับ! ✋',
            'พร้อมให้บริการครับ! 🎯'
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        message.reply(randomResponse);
    }
});

// จัดการ Error
client.on('error', error => {
    console.error('❌ Discord client error:', error);
});

client.on('disconnect', () => {
    console.log('⚠️ Bot disconnected, attempting to reconnect...');
});

client.on('reconnecting', () => {
    console.log('🔄 Bot reconnecting...');
});

process.on('unhandledRejection', error => {
    console.error('❌ Unhandled promise rejection:', error);
});

// การจัดการการปิดโปรแกรม
process.on('SIGINT', () => {
    console.log('🛑 Bot is shutting down...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Bot is being terminated...');
    client.destroy();
    process.exit(0);
});

// เข้าสู่ระบบด้วย Token
const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ ไม่พบ DISCORD_TOKEN ใน environment variables');
    process.exit(1);
}

console.log('🚀 Starting Discord bot with Keep-Alive system...');
console.log('🌐 Express server will start on port', PORT);

client.login(token).catch(error => {
    console.error('❌ ไม่สามารถเข้าสู่ระบบได้:', error);
    process.exit(1);
});