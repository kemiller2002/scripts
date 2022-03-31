const { create } = require("domain");
const fs = require("fs");
const { isNullOrUndefined } = require("util");

newAttributeList = [];

function updateAttributeList(attributes) {
  newAttributeList = [...newAttributeList, ...attributes];
}

function changeCssToClass(css) {
  return css
    .split(";")
    .map((x) => x.replace(" ", "").replace(":", "-"))
    .join(" ");
}

function getName(c, v) {
  if (c.found) {
    return c;
  }

  if (v === " ") {
    return Object.assign({}, c, { found: true });
  }

  return Object.assign({}, c, { name: (c.name || "") + v });
}

function processAttributes(c, v, ci, array) {
  const separators = "\"'\\";

  const createObject = (upd) => Object.assign({}, c, upd);

  if (separators.indexOf(v) >= 0) {
    if (c.separator != v) {
      return createObject({ separator: (c.separator || "") + v, separatorIndexes: [ci, ...(c.separatorIndexes || [])] });
    } else if (c.separator == v) {
      return createObject({ name: c.name.trim(), complete: true });
    }
  } else if (c.separator) {
    return createObject({ value: (c.value || "") + v });
  } else if (v === " " && !c.separator && c.name) {
    return createObject({ name: c.name, complete: true });
  } else {
    return createObject({ name: (c.name || "") + (v === "=" ? "" : v) });
  }
}

function processList(c, v, ci, array) {
  const createObject = (upd) => Object.assign({}, c, upd);
  const attributeEntry = processAttributes(c.current, v, ci, array);

  if (attributeEntry.complete) {
    return createObject({ current: { name: null, separator: null }, attributes: [...c.attributes, attributeEntry] });
  } else {
    return createObject({ current: attributeEntry });
  }
}

function processElement(updateAttributeList, totalElement) {
  const element = totalElement.replace(/(<|>)/g, "").trim();
  elementName = element.split("").reduce(getName, { name: null, found: false }).name;

  const attributesWrapper = element
    .replace(elementName, "")
    .trim()
    .split("")
    .reduce(processList, { attributes: [], current: { name: null, separator: null } });

  const attributes = attributesWrapper.attributes;

  const style = attributes.find((x) => x.name.toLowerCase() === "style");

  if (!style || !style.value) {
    //console.log(attributes);//
  } else {
    const styleValues = style.value
      .split(";")
      .map((s) => s.trim().replace(/:/g, "@").replace(/ /g, "^"))
      .join(" ");

    const oldClassAttribute = attributes.find((a) => a.name.toLowerCase() === "class") || { name: "class", value: "" };
    const newClassAttribute = Object.assign({}, oldClassAttribute, { value: oldClassAttribute.value + " " + styleValues });

    const attributeList = [...attributes.filter((a) => a === style).filter((a) => a === oldClassAttribute), newClassAttribute];
    const concatenatedAttributes = attributeList
      .map((x) => `${x.name}=${x.separator}${x.value}${x.separator}`)
      .join(" ")
      .trim();
    const newElement = `<${elementName} ${concatenatedAttributes}>`;

    updateAttributeList(attributeList);

    return newElement;
  }
}

function processTag(updateAttributeList, match) {
  return processElement(updateAttributeList, match);
}

function processFile(updateAttributeList, path) {
  const contents = fs.readFileSync(path, { encoding: "utf8", flag: "r" });

  newContents = contents.replace(/<.*style=["'\\\/]+.*\>/gim, (m) => processTag(updateAttributeList, m));

  console.log(newContents);
}

processFile(updateAttributeList, "test/_DynamicForm.cshtml");
