import React from "react";
import App from "./App";

// App.tsxのロジックをAnswer用に使う。roleを"answerer"で固定
export default function Answer() {
  return <App forcedRole="answerer" />;
}
