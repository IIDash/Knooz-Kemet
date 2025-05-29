// Sidebar
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('backdrop');
  const menuToggle = document.querySelector('.menu-toggle');
  const closeBtn = document.querySelector('#close-btn');

  const toggleSidebar = () => {
    if (sidebar && backdrop) {
      sidebar.classList.toggle('active');
      backdrop.classList.toggle('active');
    }
  };

  if (menuToggle) {
    menuToggle.addEventListener('click', toggleSidebar);
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', toggleSidebar);
  } else {
    console.error('Close button not found');
  }
  if (backdrop) {
    backdrop.addEventListener('click', toggleSidebar);
  }
});

// Chatbot
const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm && promptForm.querySelector(".prompt-input");
const fileInput = promptForm && promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm && promptForm.querySelector(".file-upload-wrapper");
const themeToggle = document.querySelector("#theme-toggle-btn");

const API_KEY = "AIzaSyAHSRyaJZFN3w2DzoSnn9z6Ew3aBS-z_qo";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

let typingInterval, controller;
const chatHistory = [
  {
    role: "model",
    parts: [{ text: "Hey! I'm your AI assistant powered by El3saba . Ask me anything!" }],
  },
];

const userData = { message: "", file: {} };

const createMsgElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

const scrollToBottom = () => {
  if (container) {
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }
};

const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.innerHTML = "";
  let charIndex = 0;
  typingInterval = setInterval(() => {
    if (charIndex < text.length) {
      textElement.innerHTML = text.slice(0, ++charIndex);
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
    }
  }, 10);
};

const processResponseText = (text) => {
  try {
    let processedText = text
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') // bold markdown
      .replace(/\*/g, '') // remove all asterisks
      .replace(/^#{1,6}\s*(.*?)$/gm, '<b>$1</b>') // bold headings
      .replace(/^(.+?):\s*$/gm, '<b>$1:</b>'); // bold before colon
    return processedText;
  } catch (error) {
    console.error('Error processing response text:', error);
    return text;
  }
};

const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller = new AbortController();

  chatHistory.push({
    role: "user",
    parts: [{ text: userData.message }, ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }] : [])]
  });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: chatHistory.slice(1) }),
      signal: controller.signal
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "API request failed");

    const responseText = data.candidates[0].content.parts[0].text.trim();
    typingEffect(processResponseText(responseText), textElement, botMsgDiv); // ✅ updated here

    chatHistory.push({ role: "model", parts: [{ text: responseText }] });

  } catch (error) {
    textElement.style.color = "#d62939";
    textElement.textContent = error.name === "AbortError" ? "Response generation has been stopped." : error.message;
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");
  } finally {
    userData.file = {};
  }
  scrollToBottom();
};

const handleFormSubmit = (e) => {
  e.preventDefault();
  const userMessage = promptInput?.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding")) return;
  if (promptInput) promptInput.value = "";
  userData.message = userMessage;
  document.body.classList.add("bot-responding", "chats-active");
  if (fileUploadWrapper) {
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
  }

  const userMsgHTML = `
    <p class="message-text"></p>
    ${userData.file.data ? (userData.file.isImage ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />` : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`) : ""}`;

  const userMsgDiv = createMsgElement(userMsgHTML, "user-message");
  userMsgDiv.querySelector(".message-text").textContent = userMessage;
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();

  setTimeout(() => {
    const botMsgHTML = `<img src="AI ChatBot Images/AI Logo.png" class="avatar" alt="Bot Avatar"><p class="message-text">انتظر لحظة...</p>`;
    const botMsgDiv = createMsgElement(botMsgHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
  }, 600);
};

if (fileInput) {
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
      fileInput.value = "";
      const base64String = e.target.result.split(",")[1];
      if (fileUploadWrapper) {
        fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
        fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");
      }

      userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };
    };
  });
}

document.querySelector("#cancel-file-btn")?.addEventListener("click", () => {
  userData.file = {};
  if (fileUploadWrapper) {
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
  }
});

document.querySelector("#stop-response-btn")?.addEventListener("click", () => {
  userData.file = {};
  controller?.abort();
  clearInterval(typingInterval);
  chatsContainer.querySelector(".bot-message.loading")?.classList.remove("loading");
  document.body.classList.remove("bot-responding");
});

document.querySelector("#delete-chats-btn")?.addEventListener("click", () => {
  chatHistory.length = 0;
  chatHistory.push({
    role: "model",
    parts: [{ text: "Hey! I'm your AI assistant powered by El3saba. Ask me anything!" }],
  });
  chatsContainer.innerHTML = "";
  document.body.classList.remove("bot-responding", "chats-active");
});

document.querySelectorAll(".suggestions-item").forEach(item => {
  item.addEventListener("click", () => {
    if (promptInput && promptForm) {
      promptInput.value = item.querySelector(".text").textContent;
      promptForm.dispatchEvent(new Event("submit"));
    }
  });
});

document.addEventListener("click", ({ target }) => {
  const wrapper = document.querySelector(".prompt-wrapper");
  if (wrapper) {
    const shouldHide = target.classList.contains("prompt-input") || (wrapper.classList.contains("hide-controls") && (target.id === "add-file-btn" || target.id === "stop-response-btn"));
    wrapper.classList.toggle("hide-controls", shouldHide);
  }
});

// Theme toggle
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const isLightTheme = document.body.classList.toggle("light-theme");
    localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
    themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";
  });

  const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
  document.body.classList.toggle("light-theme", isLightTheme);
  themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";
}

promptForm?.addEventListener("submit", handleFormSubmit);
promptForm?.querySelector("#add-file-btn")?.addEventListener("click", () => fileInput?.click());

// ScrollReveal Animations
ScrollReveal().reveal('nav > ul > li', {
  reset: true,
  distance: '30px',
  origin: 'right',
  duration: 800,
  delay: 300,
  interval: 50,
  easing: 'ease-in-out',
  opacity: 0
});

ScrollReveal().reveal(".heading, .sub-heading", {
  distance: '90px',
  reset: true,
  origin: 'bottom',
  duration: 1200,
  delay: 500,
  interval: 100,
  easing: 'ease-in-out'
});

ScrollReveal().reveal(".suggestions, .suggestions-item", {
  distance: '90px',
  reset: true,
  origin: 'right',
  duration: 1200,
  delay: 900,
  interval: 700,
  easing: 'ease-in-out'
});
