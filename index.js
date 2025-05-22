const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const express = require('express');
const config = require('./config.json');

// Express Server สำหรับ Keep-Alive
const app = express();
const PORT = process.env.PORT || 3000;

// สร้าง Discord Client พร้อม intents ที่จำเป็น
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ],
    // ตั้งค่าเพิ่มเติมเพื่อความเสถียร
    presence: {
        activities: [{
            name: config.status || 'กำลังออนไลน์ 24/7',
            type: ActivityType.Watching
        }],
        status: 'online'
    }
});

// ===== EXPRESS SETUP (Keep-Alive System) =====
app.use(express.json());

app.get('/', (req, res) => {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    res.json({
        status: 'Bot Online! 🟢',
        uptime: `${hours}h ${minutes}m ${seconds}s`,
        bot: client.user ? {
            name: client.user.username,
            id: client.user.id,
            status: 'Online'
        } : 'Starting...',
        guilds: client.guilds.cache.size,
        users: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
        ping: client.ws.ping || 'N/A',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        bot: client.user ? 'online' : 'offline',
        ping: client.ws.ping || 'N/A',
        timestamp: new Date().toISOString()
    });
});

app.get('/restart', (req, res) => {
    res.json({ message: 'Restarting bot...' });
    setTimeout(() => {
        process.exit(0);
    }, 1000);
});

const server = app.listen(PORT, () => {
    console.log(`🌐 Keep-Alive server running on port ${PORT}`);
});

// ===== KEEP-ALIVE SYSTEM =====
function startKeepAlive() {
    const pingInterval = 13 * 60 * 1000; // 13 นาที
    const appUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    
    setInterval(async () => {
        try {
            const response = await fetch(`${appUrl}/health`);
            const data = await response.json();
            console.log(`🔄 Keep-alive: ${data.status} | Ping: ${client.ws.ping}ms | ${new Date().toLocaleTimeString('th-TH')}`);
        } catch (error) {
            console.log(`⚠️ Keep-alive failed: ${error.message}`);
            // ลองใช้ http module แทน
            const http = require('http');
            http.get(`${appUrl}/health`, (res) => {
                console.log(`🔄 Backup keep-alive successful`);
            }).on('error', () => {
                console.log(`❌ All keep-alive methods failed`);
            });
        }
    }, pingInterval);
    
    console.log('🔄 Keep-alive system started (every 13 minutes)');
}

// ===== AUTO-RECONNECT SYSTEM =====
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function handleReconnect() {
    if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`🔄 Attempting to reconnect... (${reconnectAttempts}/${maxReconnectAttempts})`);
        
        setTimeout(() => {
            client.login(process.env.DISCORD_TOKEN || config.token).catch(error => {
                console.error(`❌ Reconnect attempt ${reconnectAttempts} failed:`, error.message);
                if (reconnectAttempts >= maxReconnectAttempts) {
                    console.log('💀 Max reconnect attempts reached. Restarting process...');
                    process.exit(1);
                } else {
                    handleReconnect();
                }
            });
        }, 5000 * reconnectAttempts); // เพิ่มเวลารอตามจำนวนครั้งที่ลอง
    }
}

// ===== DISCORD BOT EVENTS =====
client.once('ready', () => {
    console.log('\n🎉 ===== BOT SUCCESSFULLY STARTED =====');
    console.log(`✅ Bot: ${client.user.tag}`);
    console.log(`📊 Guilds: ${client.guilds.cache.size}`);
    console.log(`👥 Users: ${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)}`);
    console.log(`🏓 Ping: ${client.ws.ping}ms`);
    console.log('=====================================\n');
    
    // รีเซ็ตตัวนับ reconnect
    reconnectAttempts = 0;
    
    // ตั้งสถานะ
    client.user.setPresence({
        activities: [{
            name: config.status || 'ออนไลน์ 24/7 | !help',
            type: ActivityType.Watching
        }],
        status: 'online'
    });
    
    // เริ่ม keep-alive system
    startKeepAlive();
});

// เมื่อเชื่อมต่อสำเร็จ
client.on('reconnecting', () => {
    console.log('🔄 Reconnecting to Discord...');
});

// เมื่อเชื่อมต่อสำเร็จอีกครั้ง
client.on('resumed', () => {
    console.log('✅ Successfully resumed connection!');
    reconnectAttempts = 0;
});

// จัดการ disconnect
client.on('disconnect', () => {
    console.log('⚠️ Bot disconnected from Discord');
    handleReconnect();
});

// จัดการ error
client.on('error', error => {
    console.error('❌ Discord client error:', error);
    if (error.code === 'TOKEN_INVALID') {
        console.error('💀 Invalid token! Please check your DISCORD_TOKEN');
        process.exit(1);
    }
});

client.on('warn', info => {
    console.warn('⚠️ Discord warning:', info);
});

// จัดการ rate limit
client.on('rateLimit', (info) => {
    console.log(`⏱️ Rate limited: ${info.method} ${info.path} - ${info.timeout}ms`);
});

// ===== MESSAGE HANDLING =====
client.on('messageCreate', async (message) => {
    // ไม่ตอบบอทอื่น
    if (message.author.bot) return;
    
    const content = message.content.toLowerCase();
    const prefix = config.prefix || '!';
    
    // เช็คว่าข้อความขึ้นต้นด้วย prefix หรือไม่
    if (!content.startsWith(prefix)) {
        // ตอบเมื่อมีคนเอ่ยถึงบอท
        if (content.includes('บอท') || content.includes('bot')) {
            const responses = config.autoReply || [
                'เรียกผมไหมครับ? 🤖',
                'มีอะไรให้ช่วยไหมครับ?',
                'ผมอยู่นี่แล้วครับ! ✋'
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            return message.reply(randomResponse);
        }
        return;
    }
    
    // ตัดคำสั่งออกจาก prefix
    const args = content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    try {
        // คำสั่งพื้นฐาน
        switch (command) {
            case 'ping':
                const sent = Date.now();
                const msg = await message.reply('🏓 กำลังเช็ค ping...');
                const timeDiff = Date.now() - sent;
                await msg.edit(`🏓 Pong!\n📶 Latency: \`${timeDiff}ms\`\n💓 API Ping: \`${Math.round(client.ws.ping)}ms\``);
                break;
                
            case 'uptime':
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
                
                await message.reply(`⏰ **บอทออนไลน์มาแล้ว:** ${uptimeString}\n🔄 **Keep-Alive:** Active\n🟢 **สถานะ:** Online`);
                break;
                
            case 'status':
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
                            name: '🟢 สถานะ',
                            value: 'ออนไลน์',
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
                        text: '24/7 Online • Keep-Alive Active'
                    }
                };
                await message.reply({ embeds: [statusEmbed] });
                break;
                
            case 'help':
                const helpEmbed = {
                    color: 0x0099FF,
                    title: '📋 คำสั่งที่ใช้ได้',
                    description: `ใช้ prefix: \`${prefix}\``,
                    fields: [
                        {
                            name: `${prefix}ping`,
                            value: 'เช็ค ping และ latency',
                            inline: true
                        },
                        {
                            name: `${prefix}uptime`,
                            value: 'ดูเวลาที่บอทออนไลน์',
                            inline: true
                        },
                        {
                            name: `${prefix}status`,
                            value: 'ดูสถานะของบอท',
                            inline: true
                        },
                        {
                            name: `${prefix}server`,
                            value: 'ข้อมูลเซิร์ฟเวอร์',
                            inline: true
                        },
                        {
                            name: `${prefix}user`,
                            value: 'ข้อมูลผู้ใช้',
                            inline: true
                        },
                        {
                            name: `${prefix}restart`,
                            value: 'รีสตาร์ทบอท (เฉพาะ Owner)',
                            inline: true
                        }
                    ],
                    timestamp: new Date(),
                    footer: {
                        text: 'บอทออนไลน์ 24/7 | Hosted on Render'
                    }
                };
                await message.reply({ embeds: [helpEmbed] });
                break;
                
            case 'server':
                if (!message.guild) return message.reply('คำสั่งนี้ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น');
                
                const guild = message.guild;
                const serverEmbed = {
                    color: 0x00FF00,
                    title: `📊 ข้อมูลเซิร์ฟเวอร์: ${guild.name}`,
                    thumbnail: {
                        url: guild.iconURL() || null
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
                await message.reply({ embeds: [serverEmbed] });
                break;
                
            case 'user':
                const user = message.author;
                const member = message.member;
                
                const userEmbed = {
                    color: 0xFF0000,
                    title: '👤 ข้อมูลผู้ใช้',
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
                
                if (member && member.joinedAt) {
                    userEmbed.fields.push({
                        name: '📥 เข้าร่วมเซิร์ฟเวอร์เมื่อ',
                        value: member.joinedAt.toLocaleDateString('th-TH'),
                        inline: true
                    });
                }
                
                await message.reply({ embeds: [userEmbed] });
                break;
                
            case 'restart':
                // เฉพาะ owner เท่านั้น
                const ownerIds = config.owners || [];
                if (!ownerIds.includes(message.author.id)) {
                    return message.reply('❌ คุณไม่มีสิทธิ์ใช้คำสั่งนี้');
                }
                
                await message.reply('🔄 กำลังรีสตาร์ทบอท...');
                console.log(`🔄 Bot restart requested by ${message.author.tag}`);
                setTimeout(() => {
                    process.exit(0);
                }, 2000);
                break;
                
            default:
                // หาคำสั่งใน config
                if (config.commands && config.commands[command]) {
                    const cmd = config.commands[command];
                    await message.reply(cmd.response || 'ไม่พบการตอบกลับ');
                }
                break;
        }
    } catch (error) {
        console.error(`❌ Error handling command "${command}":`, error);
        await message.reply('❌ เกิดข้อผิดพลาดในการประมวลผลคำสั่ง').catch(() => {});
    }
});

// ===== PROCESS HANDLERS =====
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down bot gracefully...');
    client.destroy();
    server.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    client.destroy();
    server.close();
    process.exit(0);
});

// ===== START BOT =====
const token = process.env.DISCORD_TOKEN || config.token;
if (!token) {
    console.error('❌ ไม่พบ DISCORD_TOKEN ใน environment variables หรือ config.json');
    process.exit(1);
}

console.log('🚀 Starting stable Discord bot...');
console.log(`🌐 Keep-alive server will run on port ${PORT}`);

client.login(token).catch(error => {
    console.error('❌ Failed to login:', error);
    process.exit(1);
});
