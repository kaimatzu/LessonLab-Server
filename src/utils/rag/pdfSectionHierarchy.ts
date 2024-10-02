import { SectionNode, Hierarchy, Section } from '../../../src/models/documentModel';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const generateId = (): string => uuidv4();

// Function to preprocess and sort the flat nodes by page_number and top value
const preprocessFlatNodes = (flatJson: SectionNode[]): SectionNode[] => {
  return flatJson.sort((a, b) => {
    if (a.page_number === b.page_number) {
      return a.top - b.top; // Sort by 'top' if on the same page
    }
    return a.page_number - b.page_number; // Sort by 'page_number'
  });
};

// Function to create the basic hierarchy from the flat array
const createHierarchy = (flatJson: SectionNode[]): Hierarchy => {
  const hierarchy: Hierarchy = {
    title: null,
    sections: [],
    danglingContent: []
  };

  let currentSection: Section | null = null;

  for (const node of flatJson) {
    if (node.type === 'Title') {
      hierarchy.title = node.text;
    } else if (node.type === 'Section header') {
      if (currentSection) {
        hierarchy.sections.push(currentSection); // Push the last section before starting a new one
      }
      // Start a new section
      currentSection = {
        left: node.left,
        top: node.top,
        width: node.width,
        height: node.height,
        page_number: node.page_number,
        page_width: node.page_width,
        page_height: node.page_height,
        id: generateId(),
        section_title: node.text,
        content: [],
        type: node.type
      };
    } else {
      // Handle content without a section (dangling content)
      if (currentSection) {
        currentSection.content.push(node); // Append to current section if it exists
      } else {
        hierarchy.danglingContent.push(node); // No section yet, treat as dangling content
      }
    }
  }

  // Add the final section if there is one
  if (currentSection) {
    hierarchy.sections.push(currentSection);
  }

  return hierarchy;
};

// Function to recursively nest sections based on their 'left' and 'top' values (indentation and vertical order)
const nestSections = (sections: Section[]): Section[] => {
  const nested: Section[] = [];
  const stack: Section[] = [];

  for (const section of sections) {
    // Ensure section has content and the first content is a SectionNode with 'left' and 'top'
    if (!section.content.length || !(section.content[0] as SectionNode).left || !(section.content[0] as SectionNode).top) {
      // Skip this section if it has no content or the first content is not a valid SectionNode
      nested.push(section);
      continue;
    }

    const firstContent = section.content[0] as SectionNode;

    // Ensure stack has valid sections and pop sections if needed based on 'left' and 'top' values
    while (
      stack.length > 0 &&
      (stack[stack.length - 1].content[0] as SectionNode).left && 
      (stack[stack.length - 1].content[0] as SectionNode).top &&
      (firstContent.left <= (stack[stack.length - 1].content[0] as SectionNode).left ||
       firstContent.top <= (stack[stack.length - 1].content[0] as SectionNode).top)
    ) {
      stack.pop();
    }

    if (stack.length > 0) {
      // Append as a child section to the current top of the stack
      stack[stack.length - 1].content.push(section);
    } else {
      // It's a top-level section
      nested.push(section);
    }

    // Add this section to the stack
    stack.push(section);
  }

  return nested;
};


// Main function to process the flat array and create a hierarchy
export const processFlatJson = (flatJson: SectionNode[]): Hierarchy => {
  // Preprocess the flat nodes to arrange them by page_number and top value
  const sortedFlatJson = preprocessFlatNodes(flatJson);

  // Create the basic hierarchy structure
  let hierarchy = createHierarchy(sortedFlatJson);

  // Nest sections based on 'left' and 'top' values (indicating indentation and vertical position)
  hierarchy.sections = nestSections(hierarchy.sections);

  return hierarchy;
};


// Function to save the JSON data to a file
export const saveDebugJson = (data: any, filename: string) => {
  const filePath = path.join(__dirname, filename);  // You can specify a custom path here
  fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
    if (err) {
      console.error('Error writing debug file:', err);
    } else {
      console.log(`Debug file saved at ${filePath}`);
    }
  });
};
