import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import HorizontalRule from "@tiptap/extension-horizontal-rule";

export const CleanStarter = [
  Document,
  Paragraph,
  Text,
  HardBreak.configure({ keepMarks: true }),
  BulletList,
  OrderedList,
  ListItem,
  HorizontalRule,
];
