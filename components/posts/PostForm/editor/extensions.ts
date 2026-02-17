import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Heading from "@tiptap/extension-heading";
import HardBreak from "@tiptap/extension-hard-break";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Link from "@tiptap/extension-link";
import BulletList from "@tiptap/extension-bullet-list";
import ListItem from "@tiptap/extension-list-item";
import Blockquote from "@tiptap/extension-blockquote";
import ListKeymap from "@tiptap/extension-list-keymap";
import History from "@tiptap/extension-history";
import Placeholder from "@tiptap/extension-placeholder";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import Strike from "@tiptap/extension-strike";

import { MathExtension } from "@/components/math/MathExtension";
import { Tag } from "@/features/Tag";
import { SafeCode } from "@/features/SafeCode";
import { Mention } from "@/features/Mention";
import { MentionSuggestion } from "@/features/MentionSuggestion";
import { NoRulesStarterKit } from "@/features/NoRulesStarterKit";
import { PreserveEmptyLinesOnPaste } from "@/features/PreserveEmptyLinesOnPaste";
import { ImagePlaceholder } from "@/features/ImagePlaceholder";
import { CursorExitFix } from "@/features/CursorExitFix";
import { InlineBackspaceFix } from "@/features/InlineBackspaceFix";
import { FixHeadingEnter } from "@/features/ExitHeadingOnEnter";
import { LinkCardExtension } from "@/features/linkcard";
import { AtomBoundaryFix } from "@/features/AtomBoundaryFix";
import { BackspaceExitListLikeEnter } from "@/features/BackspaceExitListLikeEnter";
import { RestorePrismBlockOnDelete } from "@/features/RestorePrismBlockOnDelete";
import { FloatingMenuIndexedShortcuts } from "@/features/FloatingMenuIndexedShortcuts";
import { ClearFormatting } from "@/features/ClearFormatting";
import { PrismBlockWithView } from "@/features/PrismBlockWithView";
import { CodeFenceHandler } from "@/features/CodeFenceHandler";

export function buildExtensions(finalPlaceholder: string) {
  return [
    Document,
    RestorePrismBlockOnDelete,
    Paragraph,
    Text,
    PreserveEmptyLinesOnPaste,

    Heading.configure({ levels: [1, 2, 3] }),

    HorizontalRule,
    HardBreak.configure({ keepMarks: true }),

    NoRulesStarterKit,

    Bold,
    Italic,
    Underline,
    Strike,
    SafeCode,
    PrismBlockWithView,
    CodeFenceHandler,

    Tag,
    Mention,
    MentionSuggestion,
    ImagePlaceholder,
    InlineBackspaceFix,
    AtomBoundaryFix,
    MathExtension,
    Link.configure({
      autolink: false,
    }),

    BulletList,
    ListItem,
    Blockquote,
    LinkCardExtension,

    FixHeadingEnter,
    ListKeymap,

    BackspaceExitListLikeEnter,
    FloatingMenuIndexedShortcuts,
    ClearFormatting,

    CursorExitFix,

    Placeholder.configure({
      placeholder: finalPlaceholder,
    }),

    History.configure({
      depth: 200,
      newGroupDelay: 300,
    }),
  ];
}
