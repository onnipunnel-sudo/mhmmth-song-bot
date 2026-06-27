const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = String(process.env.ADMIN_ID);

let sources = [
  { name: "Website 1", url: process.env.SITE1_URL },
  { name: "Website 2", url: process.env.SITE2_URL }
];

let lastResults = {};

bot.start((ctx) => {
  ctx.reply("Send any song name. I will search and send audio.");
});

bot.on("text", async (ctx) => {
  const query = ctx.message.text.trim().toLowerCase();
  if (query.startsWith("/")) return;

  await ctx.reply("Searching... 🔎");

  let results = [];

  for (const source of sources) {
    if (!source.url) continue;

    try {
      const res = await axios.get(source.url, { timeout: 10000 });
      const songs = res.data;

      const found = songs.filter(song =>
        song.title?.toLowerCase().includes(query)
      ).map(song => ({
        ...song,
        sourceName: source.name
      }));

      results.push(...found);
    } catch (err) {}
  }

  if (!results.length) return ctx.reply("No songs found.");

  results = results.slice(0, 10);
  lastResults[ctx.from.id] = results;

  const buttons = results.map((song, i) => [
    Markup.button.callback(
      `${song.title} - ${song.artist} (${song.year})`,
      `song_${i}`
    )
  ]);

  ctx.reply("Select song:", Markup.inlineKeyboard(buttons));
});

bot.action(/song_(\d+)/, async (ctx) => {
  const index = Number(ctx.match[1]);
  const songs = lastResults[ctx.from.id];

  if (!songs || !songs[index]) {
    return ctx.answerCbQuery("Search expired.");
  }

  const song = songs[index];

  await ctx.reply(`Sending audio...\n${song.title}`);

  await ctx.replyWithAudio(
    { url: song.audioUrl },
    {
      title: song.title,
      performer: song.artist,
      caption: `${song.title}\nArtist: ${song.artist}\nYear: ${song.year}\nSource: ${song.sourceName}`
    }
  );
});

bot.launch();
console.log("Bot running...");
