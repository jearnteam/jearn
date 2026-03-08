import http from "k6/http";
import { sleep } from "k6";

export const options = {
    vus: 100,
    duration: "30s",
  };

export default function () {
  http.get("https://jearn.site/post/69966c8c22a888ec3b7b4bdd");
  sleep(1);
}