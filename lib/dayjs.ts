import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

// Load built-in locales
import "dayjs/locale/en";
import "dayjs/locale/ja";

// Load your custom Burmese locale
import "@/lib/dayjs-burmese";

// Enable plugin
dayjs.extend(relativeTime);

// Export unified dayjs
export default dayjs;
