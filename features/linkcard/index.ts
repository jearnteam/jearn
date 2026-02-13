import { Extension } from "@tiptap/core";
import { LinkCardNode } from "./LinkCardNode";
import { LinkCardPlugin } from "./LinkCardPlugin";
import { EmbedNode } from "../embed/EmbedNode";
import { InlineLinkNode } from "./InlineLinkNode";

export const LinkCardExtension = Extension.create({
  name: "linkCardBundle",
  addExtensions() {
    return [LinkCardNode, LinkCardPlugin, EmbedNode, InlineLinkNode,];
  },
});
