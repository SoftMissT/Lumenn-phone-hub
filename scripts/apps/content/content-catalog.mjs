// Os seis apps de conteúdo são a mesma coisa vista de ângulos diferentes: uma
// lista de itens que o GM enviou para um personagem. Nada aqui tem store,
// socket ou painel próprio — todos leem o mesmo pipeline de notificações.
//
// `threaded` é a única diferença estrutural: Mensagens agrupa por conversa,
// os outros listam item a item.

export const CONTENT_APPS = Object.freeze([
  Object.freeze({
    id: "messages",
    name: "LPH.Apps.Messages",
    icon: "fas fa-comment-dots",
    brand: "fas fa-comment-dots",
    tile: "#22C55E",
    order: 20,
    threaded: true,
    emptyKey: "LPH.Apps.MessagesEmpty",
  }),
  Object.freeze({
    id: "instagram",
    name: "LPH.Apps.Instagram",
    icon: "fas fa-camera-retro",
    brand: "fa-brands fa-instagram",
    tile: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
    order: 21,
    threaded: false,
    template: "apps/instagram.hbs",
    stories: true,
    emptyKey: "LPH.Apps.InstagramEmpty",
  }),
  Object.freeze({
    id: "photos",
    name: "LPH.Apps.Photos",
    icon: "fas fa-images",
    brand: "fas fa-images",
    tile: "linear-gradient(135deg,#F59E0B,#EA580C)",
    order: 22,
    threaded: false,
    emptyKey: "LPH.Apps.PhotosEmpty",
  }),
  Object.freeze({
    id: "bank",
    name: "LPH.Apps.Bank",
    icon: "fas fa-landmark",
    brand: "fas fa-landmark",
    tile: "#1A56DB",
    order: 23,
    threaded: false,
    emptyKey: "LPH.Apps.BankEmpty",
  }),
  Object.freeze({
    id: "news",
    name: "LPH.Apps.News",
    icon: "fas fa-newspaper",
    brand: "fas fa-newspaper",
    tile: "#E03131",
    order: 24,
    threaded: false,
    emptyKey: "LPH.Apps.NewsEmpty",
  }),
  Object.freeze({
    id: "spotify",
    name: "LPH.Apps.Spotify",
    icon: "fas fa-music",
    // Sem player embutido: o YouTube exige 200x200 minimos e o app tem 312 de
    // largura - um 16:9 caberia com 176 de altura, abaixo do minimo. Entao este
    // app e um cartao "tocando agora" alimentado por notificacao, como todos os
    // outros. A musica da mesa e assunto do modulo de jukebox, nao daqui.
    brand: "fas fa-music",
    tile: "#1DB954",
    order: 25,
    threaded: false,
    emptyKey: "LPH.Apps.SpotifyEmpty",
  }),
]);

export function getContentApp(id) {
  return CONTENT_APPS.find((app) => app.id === id) ?? null;
}
