// Local palettes for two screens that must not follow the day/night theme.
import { night } from '../../theme/tokens';

/**
 * The alert is always nocturnal: pure black with the night tokens, one warm
 * accent for "urgent" (contrast on card ≈ 7:1) and Sol's light only for "Lo vi".
 */
export const alertPalette = {
  bg: '#000000',
  card: night.card,
  line: night.line,
  ink: night.ink,
  muted: night.muted,
  faint: night.faint,
  urgent: '#FF9A8F',
  urgentSoft: 'rgba(255,154,143,0.16)',
  urgentLine: 'rgba(255,154,143,0.35)',
  sol: night.sol,
  onSol: night.onSol,
  calm: night.calm,
};

/**
 * WhatsApp simulation. Mirrors WhatsApp's own light and dark chat colors so
 * the preview reads as the real channel, not as the app.
 */
export const whatsappPalette = {
  day: {
    wallpaper: '#EFEAE2', bar: '#F0F2F5', barInk: '#111B21', barMuted: '#667781',
    incoming: '#FFFFFF', outgoing: '#D9FDD3', ink: '#111B21', meta: '#667781', link: '#027EB5',
    check: '#53BDEB', button: '#FFFFFF', buttonInk: '#027EB5', divider: '#E9EDEF', pill: '#FFFFFF', pillInk: '#54656F',
  },
  night: {
    wallpaper: '#0B141A', bar: '#202C33', barInk: '#E9EDEF', barMuted: '#8696A0',
    incoming: '#202C33', outgoing: '#005C4B', ink: '#E9EDEF', meta: '#8696A0', link: '#53BDEB',
    check: '#53BDEB', button: '#202C33', buttonInk: '#53BDEB', divider: '#2A3942', pill: '#182229', pillInk: '#8696A0',
  },
};
