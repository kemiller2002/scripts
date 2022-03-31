const { create } = require("domain");
const fs = require("fs");
const path = require("path");
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
  const isSeparator = (c) => separators.indexOf(c) >= 0;

  const createObject = (upd) => Object.assign({}, c, upd);

  const getNextCharacter = (position) => (array.length >= position + 1 ? array[position] : null);

  if (c.endLocation == ci || array.length <= ci + 1) {
    return createObject({ complete: true });
  }

  if ((c.valueStart && ci < c.valueStart) || c.complete || (!c.separator && v === " ") || c.endLocation > ci) {
    return c;
  }

  if (v === "=" && !c.separator) {
    const chord = [getNextCharacter(ci + 1), getNextCharacter(ci + 2)].filter(isSeparator).join("");
    return createObject({ separator: chord, valueStart: ci + chord.length + 1 });
  }

  if (isSeparator(v)) {
    const elementSeparator = c.separator || "";
    if (elementSeparator.length === 1 && elementSeparator === v) {
      return createObject({ complete: true });
    } else if (elementSeparator.length > 1) {
      const chord = v + getNextCharacter(ci + 1);

      if (elementSeparator === chord) {
        return createObject({ endLocation: ci + chord.length });
      }
    }
  }

  if (c.separator) {
    return createObject({ value: (c.value || "") + v });
  }

  return createObject({ name: (c.name || "") + v });
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
    console.log("style missing--", attributesWrapper); //
  } else {
    const styleValues = style.value
      .split(";")
      .map((s) => s.trim().replace(/:/g, "@").replace(/ /g, "^"))
      .join(" ");

    const oldClassAttribute = attributes.find((a) => a.name.toLowerCase() === "class") || { name: "class", value: "" };
    const newClassAttribute = Object.assign({}, oldClassAttribute, {
      value: (oldClassAttribute.value + " " + styleValues).trim(),
    });
    const attributeList = [...attributes.filter((a) => a !== style).filter((a) => a !== oldClassAttribute), newClassAttribute];

    const concatenatedAttributes = attributeList
      .map((x) => `${x.name}=${x.separator}${x.value}${x.separator}`)
      .join(" ")
      .trim();

    const newElement = `<${elementName} ${concatenatedAttributes}>`;

    updateAttributeList(attributeList);

    console.log(newElement);

    return newElement;
  }
}

function processTag(updateAttributeList, match) {
  return processElement(updateAttributeList, match);
}

function processFile(updateAttributeList, path) {
  const contents = fs.readFileSync(path, { encoding: "utf8", flag: "r" });

  newContents = contents.replace(/<.*style=["'\\\/]+.*\>/gm, (m) => processTag(updateAttributeList, m));
}

function* walkSync(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    if (file.isDirectory()) {
      yield* walkSync(path.join(dir, file.name));
    } else {
      if (file.name.indexOf) yield path.join(dir, file.name);
    }
  }
}

function findAndReplace(path) {
  const files = Array.from(walkSync(path));

  files.forEach((f) => {
    console.log(f);
    processFile(updateAttributeList, f);
  });

  console.log(newAttributeList);
}

findAndReplace("/builds/dfx/RenaissanceWeb");

//processFile(updateAttributeList, process.argv[0]);

//processFile(updateAttributeList, "/temp/update-script/test/_DynamicForm.cshtml");
