// NockAI landing page behavior: reveals, word reveal, demo tabs, menu, hero media, links.
(function () {
  "use strict";

  var config = window.NOCKAI_CONFIG || {};
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Hand written example answers for the demo. They show the answer style, not live model output.
  var DEMO_EXAMPLES = [
    {
      tab: "Python", color: "var(--accent)",
      prompt: "Reverse a string in Python.",
      code: "def reverse(text: str) -> str:\n    return text[::-1]",
      note: "A step of negative one walks the string backwards."
    },
    {
      tab: "TypeScript", color: "var(--cyan)",
      prompt: "Write a debounce function in TypeScript.",
      code: "function debounce<T extends (...args: any[]) => void>(fn: T, wait: number) {\n  let timer: ReturnType<typeof setTimeout>;\n  return (...args: Parameters<T>) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), wait);\n  };\n}",
      note: "Each call is delayed until wait milliseconds pass with no new call."
    },
    {
      tab: "Fix a bug", color: "var(--rose)",
      prompt: "Fix: for i in range(10) print(i)",
      code: "for i in range(10):\n    print(i)",
      note: "The loop header was missing a colon."
    },
    {
      tab: "Solidity", color: "var(--violet)",
      prompt: "Write a minimal ERC20 token in Solidity named NockToken.",
      code: "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\n\nimport \"@openzeppelin/contracts/token/ERC20/ERC20.sol\";\n\ncontract NockToken is ERC20 {\n    constructor() ERC20(\"NockToken\", \"NOCK\") {\n        _mint(msg.sender, 1_000_000 * 10 ** decimals());\n    }\n}",
      note: "It mints one million tokens to the deployer."
    }
  ];

  function $(selector, root) { return (root || document).querySelector(selector); }
  function $all(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }

  // Scroll reveal via IntersectionObserver (no scroll listeners).
  function initReveal() {
    var items = $all(".reveal");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (item) { item.classList.add("is-visible"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(function (item) { observer.observe(item); });
    // Safety net: if observers never fire (some embedded or background views), do not leave content hidden.
    setTimeout(function () {
      items.forEach(function (item) {
        var rect = item.getBoundingClientRect();
        if (rect.top < window.innerHeight * 1.1 && rect.bottom > 0) item.classList.add("is-visible");
      });
    }, 3500);
  }

  // Tagline: each word lights up as it crosses a trigger line in the lower part of the viewport.
  function initWordReveal() {
    var block = $("[data-word-reveal]");
    if (!block) return;
    var words = block.textContent.trim().split(/\s+/);
    block.textContent = "";
    var spans = words.map(function (word, index) {
      var span = document.createElement("span");
      span.className = "word";
      span.textContent = word;
      block.appendChild(span);
      if (index < words.length - 1) block.appendChild(document.createTextNode(" "));
      return span;
    });
    if (reduceMotion || !("IntersectionObserver" in window)) {
      spans.forEach(function (span) { span.classList.add("is-lit"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      var crossing = entries.filter(function (entry) { return entry.isIntersecting; })
        .sort(function (a, b) { return spans.indexOf(a.target) - spans.indexOf(b.target); });
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) entry.target.classList.remove("is-lit");
      });
      crossing.forEach(function (entry, order) {
        entry.target.style.transitionDelay = order * 60 + "ms";
        entry.target.classList.add("is-lit");
      });
    }, { rootMargin: "0px 0px -35% 0px", threshold: 0 });
    spans.forEach(function (span) { observer.observe(span); });
  }

  // Demo window: prompt tabs, code appears line by line.
  function initDemo() {
    var tabs = $(".prompt-tabs");
    var prompt = $("#demo-prompt");
    var code = $("#demo-code");
    var note = $("#demo-note");
    if (!tabs || !prompt || !code || !note) return;
    var timers = [];

    function select(example) {
      timers.forEach(clearTimeout);
      timers = [];
      prompt.textContent = example.prompt;
      note.textContent = "";
      code.textContent = "";
      example.code.split("\n").forEach(function (text, index) {
        var line = document.createElement("span");
        line.className = "line";
        line.textContent = text === "" ? " " : text;
        code.appendChild(line);
        if (reduceMotion) {
          line.classList.add("is-in");
        } else {
          timers.push(setTimeout(function () { line.classList.add("is-in"); }, 120 + index * 90));
        }
      });
      var noteDelay = reduceMotion ? 0 : 200 + example.code.split("\n").length * 90;
      timers.push(setTimeout(function () { note.textContent = example.note; }, noteDelay));
      $all(".prompt-tab", tabs).forEach(function (tab) {
        tab.setAttribute("aria-selected", String(tab.dataset.tab === example.tab));
      });
    }

    DEMO_EXAMPLES.forEach(function (example) {
      var tab = document.createElement("button");
      tab.type = "button";
      tab.className = "prompt-tab";
      tab.setAttribute("role", "tab");
      tab.dataset.tab = example.tab;
      var dot = document.createElement("span");
      dot.className = "tab-dot";
      dot.style.setProperty("--c", example.color);
      tab.appendChild(dot);
      tab.appendChild(document.createTextNode(example.tab));
      tab.addEventListener("click", function () { select(example); });
      tabs.appendChild(tab);
    });
    select(DEMO_EXAMPLES[0]);
  }

  function countWords(text) {
    var trimmed = text.replace(/```[a-z]*/g, " ").trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }

  // Race: a long typical answer types slowly while Nock Coder finishes almost at once.
  function initRace() {
    var root = $("[data-race]");
    if (!root) return;
    var slowBox = $("[data-race-slow]", root);
    var fastBox = $("[data-race-fast]", root);
    var slowCount = $('[data-count="slow"]', root);
    var fastCount = $('[data-count="fast"]', root);
    var done = $("[data-race-done]", root);
    var replay = $("[data-race-replay]");

    var slowIntro = "Great question! There are a few ways to reverse a string in Python. The simplest is slicing with a negative step, which walks the string backwards. Here is the slicing version:";
    var code = "def reverse(text: str) -> str:\n    return text[::-1]";
    var slowOutro = "Slicing returns a new string, so the original is unchanged. Let me know if you would like to see other approaches.";
    var fastNote = "A step of negative one walks the string backwards.";

    var timers = [];
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    function codeBlock() {
      var pre = document.createElement("pre");
      pre.className = "code";
      var inner = document.createElement("code");
      inner.textContent = code;
      pre.appendChild(inner);
      return pre;
    }

    function finalState() {
      slowBox.textContent = "";
      [slowIntro, null, slowOutro].forEach(function (part) {
        if (part === null) { slowBox.appendChild(codeBlock()); return; }
        var p = document.createElement("p");
        p.textContent = part;
        slowBox.appendChild(p);
      });
      fastBox.textContent = "";
      fastBox.appendChild(codeBlock());
      var note = document.createElement("p");
      note.className = "answer-note";
      note.textContent = fastNote;
      fastBox.appendChild(note);
      slowCount.textContent = String(countWords(slowIntro + " " + code + " " + slowOutro));
      fastCount.textContent = String(countWords(code + " " + fastNote));
      done.classList.add("is-visible");
    }

    function typeWords(target, text, perWordMs, onWord, onEnd) {
      var words = text.split(" ");
      var index = 0;
      var node = document.createElement("p");
      node.className = "caret";
      target.appendChild(node);
      (function step() {
        if (index >= words.length) { node.classList.remove("caret"); onEnd(); return; }
        node.textContent += (index ? " " : "") + words[index];
        onWord(1);
        index += 1;
        later(step, perWordMs);
      })();
    }

    function play() {
      clearTimers();
      slowBox.textContent = "";
      fastBox.textContent = "";
      slowCount.textContent = "0";
      fastCount.textContent = "0";
      done.classList.remove("is-visible");
      if (reduceMotion) { finalState(); return; }

      var slowWords = 0;
      var slowTotal = countWords(slowIntro + " " + code + " " + slowOutro);
      function bumpSlow(n) { slowWords = Math.min(slowTotal, slowWords + n); slowCount.textContent = String(slowWords); }

      // Slow side: intro, then code, then outro, one word at a time.
      typeWords(slowBox, slowIntro, 55, bumpSlow, function () {
        slowBox.appendChild(codeBlock());
        slowWords += countWords(code);
        slowCount.textContent = String(Math.min(slowTotal, slowWords));
        later(function () {
          typeWords(slowBox, slowOutro, 55, bumpSlow, function () { slowCount.textContent = String(slowTotal); });
        }, 400);
      });

      // Fast side: code lines, then the single sentence.
      var fastWords = 0;
      var fastTotal = countWords(code + " " + fastNote);
      var pre = codeBlock();
      var inner = pre.firstChild;
      var lines = code.split("\n");
      inner.textContent = "";
      fastBox.appendChild(pre);
      lines.forEach(function (line, i) {
        later(function () {
          inner.textContent += (i ? "\n" : "") + line;
          fastWords += countWords(line);
          fastCount.textContent = String(fastWords);
        }, 250 + i * 250);
      });
      later(function () {
        var note = document.createElement("p");
        note.className = "answer-note";
        note.textContent = fastNote;
        fastBox.appendChild(note);
        fastCount.textContent = String(fastTotal);
        done.classList.add("is-visible");
      }, 250 + lines.length * 250 + 150);
    }

    if ("IntersectionObserver" in window && !reduceMotion) {
      var observer = new IntersectionObserver(function (entries) {
        if (entries.some(function (entry) { return entry.isIntersecting; })) { play(); observer.disconnect(); }
      }, { threshold: 0.35 });
      observer.observe(root);
    } else {
      play();
    }
    if (replay) replay.addEventListener("click", play);
  }

  // Marquee rows of example prompts. Each row is duplicated so the loop is seamless.
  var USE_CASES = [
    ["Reverse a string in Python", "Regex that matches an email address", "Debounce a function in TypeScript", "Parse a CSV file in Go", "Fix an off by one error", "Write a unit test for this function", "Convert a callback to async await", "SQL query for the top ten customers"],
    ["ERC20 token with a supply cap", "Reentrancy guard in Solidity", "Read a token balance with ethers", "Explain this revert message", "Mint function with an owner check", "Emit an event on every transfer", "Send ETH safely in Solidity", "Deploy script with Foundry"],
    ["Bash one liner to rename files", "Dockerfile for a Node app", "Rust struct with serde", "Explain what this loop does", "Binary search in Java", "Flatten a nested list", "Git command to undo the last commit", "Throttle versus debounce"]
  ];

  function initMarquee() {
    var ROW_COLORS = ["var(--accent)", "var(--violet)", "var(--cyan)"];
    $all("[data-marquee]").forEach(function (row, index) {
      var prompts = USE_CASES[index % USE_CASES.length];
      [0, 1].forEach(function (copy) {
        prompts.forEach(function (text) {
          var chip = document.createElement("span");
          chip.className = "prompt-chip";
          chip.style.setProperty("--c", ROW_COLORS[index % ROW_COLORS.length]);
          chip.textContent = text;
          if (copy === 1) chip.setAttribute("aria-hidden", "true");
          row.appendChild(chip);
        });
      });
    });
  }

  // Copy buttons and the operating system tabs for the install command.
  function initCommands() {
    var OS_COMMANDS = {
      windows: "winget install Ollama.Ollama",
      macos: "brew install ollama",
      linux: "curl -fsSL https://ollama.com/install.sh | sh"
    };
    var osCommand = $("[data-os-command]");
    $all("[data-os]").forEach(function (tab) {
      tab.addEventListener("click", function () {
        $all("[data-os]").forEach(function (other) { other.setAttribute("aria-selected", String(other === tab)); });
        if (osCommand) osCommand.textContent = OS_COMMANDS[tab.dataset.os];
      });
    });
    // Pick the visitor's operating system as the default tab.
    var platform = (navigator.userAgent || "").toLowerCase();
    var guess = platform.indexOf("mac") !== -1 ? "macos" : platform.indexOf("linux") !== -1 && platform.indexOf("android") === -1 ? "linux" : "windows";
    var guessTab = $('[data-os="' + guess + '"]');
    if (guessTab) guessTab.click();

    $all(".copy").forEach(function (button) {
      button.addEventListener("click", function () {
        var text = button.parentElement.querySelector("code").textContent;
        function done(ok) {
          button.textContent = ok ? "Copied" : "Press Ctrl C";
          button.classList.toggle("is-copied", ok);
          setTimeout(function () { button.textContent = "Copy"; button.classList.remove("is-copied"); }, 1600);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
        } else {
          done(false);
        }
      });
    });
  }

  // "Will it run on my machine": a memory picture for the 4 bit build, not a speed claim.
  function initFit() {
    var ram = $("#fit-ram");
    var device = $("#fit-device");
    var verdict = $("[data-fit-verdict]");
    var detail = $("[data-fit-detail]");
    var grid = $("[data-memgrid]");
    var used = $("[data-fit-used]");
    if (!ram || !device || !grid) return;
    var MODEL_GB = 2; // roughly 1.1 GB of weights plus context and runtime overhead
    var APPS_GB = { 4: 2.5, 8: 3.5, 16: 5, 32: 6 }; // illustrative background use for a typical desktop

    function draw(memory) {
      var total = Math.min(memory, 32) * 2; // one square is half a gigabyte
      var apps = Math.round(APPS_GB[memory] * 2);
      var model = MODEL_GB * 2;
      grid.textContent = "";
      var cells = [];
      for (var i = 0; i < total; i += 1) {
        var cell = document.createElement("span");
        grid.appendChild(cell);
        cells.push(cell);
      }
      var overflow = Math.max(0, apps + model - total);
      cells.forEach(function (cell, index) {
        if (index < apps) cell.classList.add("is-apps");
        else if (index < apps + model - overflow) cell.classList.add("is-model");
        if (index >= total - overflow) cell.classList.add("is-over");
        var delay = reduceMotion ? 0 : index * 18;
        setTimeout(function () { cell.classList.add("is-in"); }, delay);
      });
      // Overflowing squares are the part of the model that would not fit next to the apps.
      if (overflow) {
        for (var j = 0; j < overflow; j += 1) cells[total - 1 - j].classList.add("is-over", "is-model");
      }
    }

    function update() {
      var memory = Number(ram.value);
      var text;
      var note;
      if (memory <= 4) {
        text = "Tight. Close other apps first.";
        note = "With typical background use the model barely fits, so expect it to be slow or fail with other apps open.";
      } else if (memory === 8) {
        text = "Yes, comfortably.";
        note = "Plenty of room for the model and your editor.";
      } else {
        text = "Yes, with room to spare.";
        note = "You could also run a bigger model alongside it.";
      }
      var where = {
        cpu: "It runs on the CPU with no graphics card needed.",
        nvidia: "With 4 GB of video memory or more it can run fully on the GPU, otherwise Ollama falls back to the CPU.",
        apple: "Ollama uses the GPU on Apple silicon automatically."
      }[device.value];
      verdict.textContent = text;
      detail.textContent = note + " " + where;
      used.textContent = "about " + Math.round(Math.min(1, MODEL_GB / memory) * 100) + "%";
      draw(memory);
    }
    ram.addEventListener("change", update);
    device.addEventListener("change", update);
    update();
  }


  // Extra scripted answers for the ask bar, on top of the demo window examples.
  var ASK_EXTRAS = [
    {
      prompt: "Regex that matches an email address",
      keywords: ["regex", "email"],
      code: "import re\n\nEMAIL = re.compile(r\"^[\\w.+-]+@[\\w-]+\\.[\\w.-]+$\")",
      note: "It matches common addresses, not every edge case in the spec."
    },
    {
      prompt: "Binary search in Python",
      keywords: ["binary", "search"],
      code: "def binary_search(items, target):\n    low, high = 0, len(items) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if items[mid] == target:\n            return mid\n        if items[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return -1",
      note: "It returns the index, or -1 when the target is missing. The list must be sorted."
    },
    {
      prompt: "Reentrancy guard in Solidity",
      keywords: ["reentrancy", "reentrant", "guard"],
      code: "import \"@openzeppelin/contracts/utils/ReentrancyGuard.sol\";\n\ncontract Vault is ReentrancyGuard {\n    mapping(address => uint256) public balances;\n\n    function withdraw() external nonReentrant {\n        uint256 amount = balances[msg.sender];\n        balances[msg.sender] = 0;\n        (bool ok, ) = msg.sender.call{value: amount}(\"\");\n        require(ok, \"Transfer failed\");\n    }\n}",
      note: "It zeroes the balance before sending ETH and blocks reentrant calls."
    },
    {
      prompt: "Git command to undo the last commit",
      keywords: ["git", "undo", "commit"],
      code: "git reset --soft HEAD~1",
      note: "It undoes the last commit and keeps your changes staged."
    }
  ];
  var ASK_KEYWORDS = {
    "Reverse a string in Python.": ["reverse", "string"],
    "Write a debounce function in TypeScript.": ["debounce"],
    "Fix: for i in range(10) print(i)": ["fix", "range", "loop", "colon"],
    "Write a minimal ERC20 token in Solidity named NockToken.": ["erc20", "token"]
  };

  function askExamples() {
    var base = DEMO_EXAMPLES.map(function (example) {
      return { prompt: example.prompt, keywords: ASK_KEYWORDS[example.prompt] || [], code: example.code, note: example.note };
    });
    return base.concat(ASK_EXTRAS);
  }

  // Live answers come from /api/ask (functions/api/ask.js), which calls Nock Coder on the Surplus API.
  // Answers are markdown: the first fenced block becomes the code, the text outside it becomes the note.
  function splitAnswer(answer) {
    var fence = /```[^\n]*\n([\s\S]*?)```/.exec(answer);
    if (!fence) return { code: "", note: answer.replace(/`([^`]+)`/g, "$1").trim() };
    var note = (answer.slice(0, fence.index) + " " + answer.slice(fence.index + fence[0].length)).replace(/\s+/g, " ").replace(/`([^`]+)`/g, "$1").trim();
    return { code: fence[1].replace(/\s+$/, ""), note: note };
  }

  function askLive(prompt) {
    return fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt })
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        if (!response.ok || typeof data.answer !== "string") throw new Error(data.error || "busy");
        return splitAnswer(data.answer);
      });
    });
  }

  // Bottom ask bar: a typed placeholder, scripted answers for the suggested prompts, live answers for anything else.
  function initAsk() {
    var root = $("[data-ask]");
    if (!root) return;
    var form = $("[data-ask-form]", root);
    var input = $("[data-ask-input]", root);
    var panel = $("[data-ask-panel]", root);
    var promptBox = $("[data-ask-prompt]", root);
    var answerBox = $("[data-ask-answer]", root);
    var examples = askExamples();
    var timers = [];
    var label = $("[data-ask-label]", root);
    var foot = $("[data-ask-foot]", root);
    var requestId = 0;  // ignores a live answer that arrives after the visitor asked something else

    // Show the bar once the hero has scrolled away.
    var hero = $(".hero");
    if (hero && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        root.classList.toggle("is-visible", entries[0].intersectionRatio < 0.4);
      }, { threshold: [0, 0.4, 1] }).observe(hero);
    } else {
      root.classList.add("is-visible");
    }

    // Typed placeholder that cycles through example prompts until the visitor focuses the field.
    var typing = !reduceMotion;
    var promptIndex = 0;
    function typePlaceholder() {
      if (!typing) return;
      var text = examples[promptIndex % examples.length].prompt;
      var shown = 0;
      (function step() {
        if (!typing) return;
        if (shown <= text.length) {
          input.placeholder = text.slice(0, shown);
          shown += 1;
          timers.push(setTimeout(step, 45));
        } else {
          promptIndex += 1;
          timers.push(setTimeout(typePlaceholder, 1800));
        }
      })();
    }
    if (typing) typePlaceholder(); else input.placeholder = "Ask Nock Coder";
    input.addEventListener("focus", function () { typing = false; input.placeholder = "Try: " + examples[0].prompt.toLowerCase(); });

    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    function match(query) {
      var lowered = query.toLowerCase();
      var best = null;
      var bestScore = 0;
      examples.forEach(function (example) {
        var score = example.keywords.filter(function (word) { return lowered.indexOf(word) !== -1; }).length;
        if (score > bestScore) { best = example; bestScore = score; }
      });
      return best;
    }

    function codeBlock(text) {
      var pre = document.createElement("pre");
      pre.className = "code";
      var inner = document.createElement("code");
      pre.appendChild(inner);
      text.split("\n").forEach(function (line, index) {
        var span = document.createElement("span");
        span.className = "line";
        span.textContent = line === "" ? " " : line;
        inner.appendChild(span);
        timers.push(setTimeout(function () { span.classList.add("is-in"); }, reduceMotion ? 0 : 120 + index * 80));
      });
      return pre;
    }

    function setMode(live) {
      label.textContent = live ? "Live answer" : "Example answer";
      foot.textContent = live
        ? "Live answer from Nock Coder v2 on Surplus. It can be wrong, so review code before you run it. Don't paste secrets."
        : "This is a scripted example answer. Type your own question for a live one.";
    }

    function suggestions(message) {
      var hint = document.createElement("p");
      hint.className = "ask-hint";
      hint.textContent = message;
      answerBox.appendChild(hint);
      var list = document.createElement("div");
      list.className = "ask-suggestions";
      examples.slice(0, 6).forEach(function (example) {
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = example.prompt;
        button.addEventListener("click", function () { input.value = ""; show(example.prompt, example); });
        list.appendChild(button);
      });
      answerBox.appendChild(list);
    }

    function showLive(query) {
      clearTimers();
      requestId += 1;
      var id = requestId;
      panel.hidden = false;
      setMode(true);
      promptBox.textContent = query;
      answerBox.textContent = "";
      var waiting = document.createElement("p");
      waiting.className = "ask-hint ask-waiting";
      waiting.textContent = "Nock Coder is writing";
      answerBox.appendChild(waiting);
      askLive(query).then(function (result) {
        if (id !== requestId) return;
        answerBox.textContent = "";
        if (result.code) answerBox.appendChild(codeBlock(result.code));
        if (result.note) {
          var note = document.createElement("p");
          note.className = "answer-note";
          answerBox.appendChild(note);
          timers.push(setTimeout(function () { note.textContent = result.note; }, reduceMotion || !result.code ? 0 : 200 + result.code.split("\n").length * 80));
        }
      }, function () {
        if (id !== requestId) return;
        answerBox.textContent = "";
        setMode(false);
        suggestions("The live model is busy right now. Try one of these examples, or run the model on your own machine.");
      });
      panel.querySelector(".ask-panel-body").scrollTop = 0;
    }

    function show(query, example) {
      clearTimers();
      requestId += 1;
      panel.hidden = false;
      setMode(false);
      promptBox.textContent = query;
      answerBox.textContent = "";
      if (example) {
        answerBox.appendChild(codeBlock(example.code));
        var note = document.createElement("p");
        note.className = "answer-note";
        answerBox.appendChild(note);
        timers.push(setTimeout(function () { note.textContent = example.note; }, reduceMotion ? 0 : 200 + example.code.split("\n").length * 80));
      } else {
        suggestions("Try one of these examples, or run the model on your own machine to ask anything.");
      }
      panel.querySelector(".ask-panel-body").scrollTop = 0;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var query = input.value.trim();
      if (!query) return;
      // Suggested prompts keep their instant scripted answer; anything else goes to the live model.
      var example = match(query);
      if (example) show(query, example); else showLive(query);
      input.value = "";
    });
    $("[data-ask-random]", root).addEventListener("click", function () {
      var example = examples[Math.floor(Math.random() * examples.length)];
      typing = false;
      show(example.prompt, example);
    });
    $("[data-ask-close]", root).addEventListener("click", function () { panel.hidden = true; clearTimers(); requestId += 1; });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape" && !panel.hidden) { panel.hidden = true; clearTimers(); } });
  }

  // Header gets a blurred background once the page has scrolled.
  function initHeader() {
    var header = $(".header");
    var sentinel = $(".top-sentinel");
    if (!header || !sentinel || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (entries) {
      header.classList.toggle("is-scrolled", !entries[0].isIntersecting);
    }).observe(sentinel);
  }

  // Local only: /?eval=dummy loads a layout preview of the evaluation section (the file is not deployed).
  function initEvalPreview() {
    if (new URLSearchParams(window.location.search).get("eval") !== "dummy") return;
    var script = document.createElement("script");
    script.src = "/preview-eval.js";
    document.body.appendChild(script);
  }

  // Mobile menu overlay.
  function initMenu() {
    var toggle = $(".menu-toggle");
    var menu = $("#menu");
    if (!toggle || !menu) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.classList.toggle("is-open", open);
      menu.setAttribute("aria-hidden", String(!open));
      document.body.style.overflow = open ? "hidden" : "";
    }
    toggle.addEventListener("click", function () { setOpen(toggle.getAttribute("aria-expanded") !== "true"); });
    $all("a, button", menu).forEach(function (item) { item.addEventListener("click", function () { setOpen(false); }); });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape") setOpen(false); });
  }

  // Optional hero media (image or looping video). Falls back to the CSS glow when not configured or on error.
  function initHeroMedia() {
    var hero = $(".hero");
    var glow = $(".hero-glow");
    // ?hero=<key> previews an alternative from config.heroVariants, handy for comparing clips locally.
    var variant = config.heroVariants && config.heroVariants[new URLSearchParams(window.location.search).get("hero")];
    var heroImage = variant ? variant.image : config.heroImage;
    var heroVideo = variant ? variant.video : config.heroVideo;
    if (!hero || !glow || (!heroImage && !heroVideo)) return;

    var media;
    if (heroVideo && !reduceMotion) {
      media = document.createElement("video");
      // heroVideo is either a single URL or a list of { src, type, media } sources; the browser picks the first match.
      [].concat(heroVideo).forEach(function (entry) {
        var source = document.createElement("source");
        source.src = typeof entry === "string" ? entry : entry.src;
        if (entry.type) source.type = entry.type;
        if (entry.media) source.media = entry.media;
        media.appendChild(source);
      });
      media.muted = true;
      media.loop = true;
      media.autoplay = true;
      media.playsInline = true;
      media.setAttribute("aria-hidden", "true");
      if (heroImage) media.poster = heroImage;
    } else if (heroImage) {
      media = document.createElement("img");
      media.src = heroImage;
      media.alt = "";
      media.decoding = "async";
    } else {
      return;
    }
    media.className = "hero-media";
    var reveal = function () { media.classList.add("is-ready"); };
    media.addEventListener(media.tagName === "VIDEO" ? "loadeddata" : "load", reveal);
    // A <video> reports load failures on its <source> children, an <img> on itself.
    var fail = function () { media.remove(); };
    media.addEventListener("error", fail);
    var lastSource = media.querySelector("source:last-of-type");
    if (lastSource) lastSource.addEventListener("error", fail);
    hero.insertBefore(media, glow.nextSibling);
  }

  // Hugging Face, X, and Telegram links appear only when configured.
  function initLinks() {
    [["huggingface", config.huggingFaceUrl], ["x", config.xUrl], ["telegram", config.telegramUrl]].forEach(function (pair) {
      $all('[data-link="' + pair[0] + '"]').forEach(function (link) {
        if (!pair[1]) return;
        link.href = pair[1];
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.hidden = false;
      });
    });
  }

  // Token address under the hero, shown only when configured.
  function initToken() {
    var root = $("[data-token]");
    if (!root) return;
    if (config.tokenTicker) $("[data-token-ticker]", root).textContent = config.tokenTicker;
    // Until the contract address is set in config, the line reads "CA Soon" with no copy button.
    if (!config.tokenAddress) return;
    var address = $("[data-token-address]", root);
    address.textContent = config.tokenAddress;
    address.classList.remove("is-pending");
    var button = $("[data-token-copy]", root);
    button.hidden = false;
    button.addEventListener("click", function () {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(config.tokenAddress).then(function () {
        button.textContent = "Copied";
        button.classList.add("is-copied");
        setTimeout(function () { button.textContent = "Copy"; button.classList.remove("is-copied"); }, 1600);
      });
    });
  }

  // Kaggle entry row, shown only after a real submission has been linked in config.
  function initKaggle() {
    var row = $("[data-kaggle]");
    if (!row || !config.kaggleEntryUrl) return;
    var link = $("[data-kaggle-link]", row);
    link.href = config.kaggleEntryUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    row.hidden = false;
  }

  initReveal();
  initWordReveal();
  initDemo();
  initRace();
  initMarquee();
  initCommands();
  initFit();
  initMenu();
  initHeader();
  initAsk();
  initHeroMedia();
  initEvalPreview();
  initLinks();
  initToken();
  initKaggle();
})();
