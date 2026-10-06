const STORAGE_KEY = "replay-material-passport-v0";
const form = document.querySelector("#passportForm");
const family = document.querySelector("#family");
const measurementFields = document.querySelector("#measurementFields");
const partId = document.querySelector("#partId");
const photo = document.querySelector("#photo");
const preview = document.querySelector("#photoPreview");
const placeholder = document.querySelector("#photoPlaceholder");
const cardGrid = document.querySelector("#cardGrid");
const emptyState = document.querySelector("#emptyState");
const filterFamily = document.querySelector("#filterFamily");
const apiKey = document.querySelector("#apiKey");
const model = document.querySelector("#model");
let imageData = "";

const loadParts = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const saveParts = (parts) => localStorage.setItem(STORAGE_KEY, JSON.stringify(parts));

function field(label, id, placeholderText, type = "number") {
  return `<label>${label}<input id="${id}" type="${type}" ${type === "number" ? "min=\"0\" step=\"0.1\"" : ""} placeholder="${placeholderText}" /></label>`;
}

function drawMeasurementFields() {
  const fields = {
    LINEAR: [field("지름 Ø (mm)", "diameter", "예: 22"), field("길이 (mm)", "length", "예: 680"), field("단면/두께 (선택)", "section", "예: 1.5")],
    PLANAR: [field("두께 (mm)", "thickness", "예: 18"), field("폭 (mm)", "width", "예: 420"), field("길이 (mm)", "length", "예: 300")],
    TEXTILE: [field("폭 (mm)", "width", "예: 500"), field("길이 (mm)", "length", "예: 800"), field("성질", "textileType", "예: woven / mesh", "text")]
  };
  measurementFields.innerHTML = fields[family.value].join("");
}

function statusFor(part) {
  if (part.family === "LINEAR") return part.diameter >= 18 && part.diameter <= 30 && part.length >= 300 && part.length <= 900 ? "ADMIT" : "HOLD";
  if (part.family === "PLANAR") return part.thickness >= 9 && part.thickness <= 18 && Math.max(part.width || 0, part.length || 0) <= 600 ? "ADMIT" : "HOLD";
  if (part.family === "TEXTILE") return part.width >= 300 ? "ADMIT" : "HOLD";
  return "HOLD";
}

function nextId(familyValue) {
  const prefix = familyValue[0];
  return `${prefix}-${String(loadParts().filter((part) => part.family === familyValue).length + 1).padStart(2, "0")}`;
}

function valuesFromForm() {
  const get = (id) => document.querySelector(`#${id}`)?.value?.trim() || "";
  const numeric = (id) => Number(get(id)) || 0;
  const part = {
    id: get("partId") || nextId(family.value),
    family: family.value,
    material: get("material") || "unidentified",
    condition: get("condition"),
    interface: get("interface"),
    affordance: get("affordance") || "not assigned",
    image: imageData,
    diameter: numeric("diameter"), thickness: numeric("thickness"), length: numeric("length"), width: numeric("width"), section: get("section"), textileType: get("textileType")
  };
  part.status = statusFor(part);
  return part;
}

function dimensionText(part) {
  if (part.family === "LINEAR") return `Ø${part.diameter || "?"} × ${part.length || "?"} mm`;
  if (part.family === "PLANAR") return `${part.width || "?"} × ${part.length || "?"} × ${part.thickness || "?"} mm`;
  return `${part.width || "?"} × ${part.length || "?"} mm / ${part.textileType || "fabric"}`;
}

function render() {
  const selected = filterFamily.value;
  const parts = loadParts().filter((part) => selected === "ALL" || part.family === selected);
  document.querySelector("#partCount").textContent = loadParts().length;
  cardGrid.innerHTML = "";
  emptyState.hidden = parts.length > 0;
  parts.forEach((part) => {
    const node = document.querySelector("#cardTemplate").content.cloneNode(true);
    const image = node.querySelector("img");
    if (part.image) { image.src = part.image; image.hidden = false; node.querySelector(".no-image").hidden = true; }
    const tag = node.querySelector(".family-tag");
    tag.textContent = `${part.family[0]} / ${part.family}`;
    tag.className = `family-tag ${part.family.toLowerCase()}`;
    const admission = node.querySelector(".admission");
    admission.textContent = part.status;
    admission.classList.add(part.status.toLowerCase());
    node.querySelector(".card-id").textContent = part.id;
    node.querySelector(".card-material").textContent = part.material;
    node.querySelector(".card-data").innerHTML = [
      ["dimensions", dimensionText(part)], ["condition", part.condition], ["interface", part.interface]
    ].map(([key, value]) => `<div><dt>${key}</dt><dd>${value}</dd></div>`).join("");
    node.querySelector(".card-affordance").textContent = `↳ ${part.affordance}`;
    node.querySelector(".delete-card").dataset.id = part.id;
    cardGrid.appendChild(node);
  });
}

function resetForm() {
  form.reset(); family.value = "LINEAR"; drawMeasurementFields(); imageData = ""; preview.hidden = true; preview.src = ""; placeholder.hidden = false; partId.value = "";
}

family.addEventListener("change", drawMeasurementFields);
photo.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { imageData = reader.result; preview.src = imageData; preview.hidden = false; placeholder.hidden = true; };
  reader.readAsDataURL(file);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const part = valuesFromForm();
  const parts = loadParts().filter((item) => item.id !== part.id);
  parts.unshift(part); saveParts(parts); resetForm(); render(); document.querySelector("#inventory").scrollIntoView({ behavior: "smooth" });
});

document.querySelector("#toggleJson").addEventListener("click", () => {
  const panel = document.querySelector("#jsonPanel"); panel.hidden = !panel.hidden;
});

function materialSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      family: { type: "string", enum: ["LINEAR", "PLANAR", "TEXTILE"] },
      material: { type: "string" },
      diameter: { type: "number" }, thickness: { type: "number" }, length: { type: "number" }, width: { type: "number" },
      section: { type: "string" }, textileType: { type: "string" },
      condition: { type: "string", enum: ["C0", "C1", "C2", "C3"] },
      interface: { type: "string", enum: ["GRIP", "REST", "TENSION", "PIN"] },
      affordance: { type: "string" }
    },
    required: ["family", "material", "diameter", "thickness", "length", "width", "section", "textileType", "condition", "interface", "affordance"]
  };
}

function responseText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  return (data.output || []).flatMap((item) => item.content || []).map((item) => item.text || "").join("");
}

document.querySelector("#analyzePhoto").addEventListener("click", async () => {
  if (!imageData) return alert("먼저 부재 사진을 추가해 주세요.");
  if (!apiKey.value.trim()) return alert("OpenAI API key를 입력해 주세요. 키는 저장되지 않습니다.");
  const button = document.querySelector("#analyzePhoto");
  const original = button.textContent; button.textContent = "분석 중..."; button.disabled = true;
  const prompt = "Analyze the attached photo of one salvaged component for an architectural reuse inventory. Classify only visible material and likely geometry. Do not infer structural safety, exact dimensions, hidden damage, or child safety from the image. Use 0 for unknown numeric values and empty strings for unknown text. For affordance, suggest 2-4 possible actions rather than a fixed furniture function. Return only the requested JSON.";
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey.value.trim()}` },
      body: JSON.stringify({
        model: model.value.trim() || "gpt-4.1-mini",
        input: [{ role: "user", content: [{ type: "input_text", text: prompt }, { type: "input_image", image_url: imageData }] }],
        text: { format: { type: "json_schema", name: "material_passport", strict: true, schema: materialSchema() } }
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || `API error ${response.status}`);
    document.querySelector("#jsonImport").value = responseText(data).trim();
    document.querySelector("#jsonPanel").hidden = false;
    document.querySelector("#applyJson").click();
    button.textContent = "분석 완료 - 검토 후 등록";
  } catch (error) {
    alert(`AI 분석에 실패했습니다.\n${error.message}`); button.textContent = original;
  } finally { button.disabled = false; }
});

document.querySelector("#applyJson").addEventListener("click", () => {
  try {
    const data = JSON.parse(document.querySelector("#jsonImport").value);
    if (data.family) { family.value = String(data.family).toUpperCase(); drawMeasurementFields(); }
    ["material", "condition", "interface", "affordance", "diameter", "thickness", "length", "width", "section", "textileType"].forEach((key) => {
      const input = document.querySelector(`#${key}`); if (input && data[key] !== undefined) input.value = data[key];
    });
  } catch { alert("유효한 JSON 형식인지 확인해 주세요."); }
});

document.querySelector("#copyPrompt").addEventListener("click", async () => {
  const prompt = `You are assisting an architectural reuse inventory. Analyze the attached photo of ONE salvaged component. Do not infer structural safety or precise dimensions from the image. Identify only its likely family and visible characteristics. Return JSON only in this exact schema:\n{\n  "family": "LINEAR | PLANAR | TEXTILE",\n  "material": "short material description",\n  "diameter": 0,\n  "thickness": 0,\n  "length": 0,\n  "width": 0,\n  "section": "optional",\n  "textileType": "optional",\n  "condition": "C0 | C1 | C2 | C3",\n  "interface": "GRIP | REST | TENSION | PIN",\n  "affordance": "2-4 possible actions, not a fixed furniture function"\n}\nUse 0 where the image cannot establish a value. The human will measure and verify all dimensions.`;
  await navigator.clipboard.writeText(prompt);
  const button = document.querySelector("#copyPrompt"); const original = button.textContent; button.textContent = "복사됨 - 사진을 ChatGPT에 첨부"; setTimeout(() => button.textContent = original, 2200);
});

filterFamily.addEventListener("change", render);
cardGrid.addEventListener("click", (event) => {
  if (!event.target.matches(".delete-card")) return;
  saveParts(loadParts().filter((part) => part.id !== event.target.dataset.id)); render();
});
document.querySelector("#clearAll").addEventListener("click", () => { if (confirm("등록된 재료 여권을 모두 지울까요?")) { localStorage.removeItem(STORAGE_KEY); render(); } });
document.querySelector("#exportJson").addEventListener("click", () => {
  const file = new Blob([JSON.stringify(loadParts(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(file); const link = document.createElement("a"); link.href = url; link.download = "replay-material-passports.json"; link.click(); URL.revokeObjectURL(url);
});

drawMeasurementFields(); render();
