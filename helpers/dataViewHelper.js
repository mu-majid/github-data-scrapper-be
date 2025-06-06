export const flattenObject = (obj, prefix = '') => {
  const flattened = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}_${key}` : key;
    
    if (value === null || value === undefined) {
      flattened[newKey] = value;
    } else if (Array.isArray(value)) {
      // Handle arrays - store as JSON string or flatten first element if it's an object
      if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
        Object.assign(flattened, flattenObject(value[0], newKey));
      } else {
        flattened[newKey] = JSON.stringify(value);
      }
    } else if (typeof value === 'object') {
      // Recursively flatten nested objects
      Object.assign(flattened, flattenObject(value, newKey));
    } else {
      flattened[newKey] = value;
    }
  }
  
  return flattened;
};

export const extractAllFields = (documents) => {
  if (!documents || documents.length === 0) return [];
  
  const fieldsSet = new Set();
  
  // Sample first 10 documents to get comprehensive field list
  const sampleSize = Math.min(10, documents.length);
  const sampleDocs = documents.slice(0, sampleSize);
  
  sampleDocs.forEach(doc => {
    if (doc && typeof doc === 'object') {
      const flattened = flattenObject(doc);
      Object.keys(flattened).forEach(field => fieldsSet.add(field));
    }
  });
  
  return Array.from(fieldsSet).sort();
};

export const flattenDocuments = (documents) => {
  if (!Array.isArray(documents)) return [];
  
  return documents.map(doc => {
    if (!doc || typeof doc !== 'object') return doc;
    return flattenObject(doc);
  });
};

export const buildSearchQuery = (searchTerm, fields = []) => {
  if (!searchTerm || !searchTerm.trim()) return {};
  
  const searchRegex = { $regex: searchTerm.trim(), $options: 'i' };
  
  if (fields.length === 0) {
    // Use text search if no specific fields provided
    return { $text: { $search: searchTerm.trim() } };
  }
  
  // Search across specified fields
  return {
    $or: fields.map(field => ({ [field]: searchRegex }))
  };
};

export const buildDateRangeQuery = (dateRange) => {
  if (!dateRange || !dateRange.start || !dateRange.end) return {};
  
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return {};
  
  const dateFields = [
    'created_at', 'updated_at', 'merged_at', 'closed_at', 
    'committed_at', 'authored_at', 'date', 'timestamp'
  ];
  
  return {
    $or: dateFields.map(field => ({
      [field]: { $gte: startDate, $lte: endDate }
    }))
  };
};

export const buildCustomFilters = (filters) => {
  if (!filters || typeof filters !== 'object') return {};
  
  const query = {};
  
  Object.entries(filters).forEach(([field, value]) => {
    if (value === null || value === undefined || value === '') return;
    
    if (typeof value === 'string') {
      query[field] = { $regex: value, $options: 'i' };
    } else if (Array.isArray(value)) {
      query[field] = { $in: value };
    } else {
      query[field] = value;
    }
  });
  
  return query;
};

export const extractAllFieldsFromDocument = (document, prefix = '') => {
  const fields = [];
  
  if (!document || typeof document !== 'object') {
    return fields;
  }

  Object.keys(document).forEach(key => {
    const value = document[key];
    const fieldName = prefix ? `${prefix}_${key}` : key;
    
    if (value === null || value === undefined) {
      fields.push(fieldName);
    } else if (Array.isArray(value)) {
      // Handle arrays - if array contains objects, extract fields from first element
      if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
        const nestedFields = extractAllFieldsFromDocument(value[0], fieldName);
        fields.push(...nestedFields);
      } else {
        fields.push(fieldName);
      }
    } else if (typeof value === 'object') {
      // Recursively extract fields from nested objects
      const nestedFields = extractAllFieldsFromDocument(value, fieldName);
      fields.push(...nestedFields);
    } else {
      // Regular field (string, number, boolean, etc.)
      fields.push(fieldName);
    }
  });

  return fields;
}

export const flattenDocumentForResponse = (document, prefix = '') => {
  const flattened = {};
  
  if (!document || typeof document !== 'object') {
    return document;
  }

  Object.keys(document).forEach(key => {
    const value = document[key];
    const fieldName = prefix ? `${prefix}_${key}` : key;
    
    if (value === null || value === undefined) {
      flattened[fieldName] = value;
    } else if (Array.isArray(value)) {
      // Handle arrays - store as JSON string or flatten first element if it's an object
      if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
        const flattenedFirst = flattenDocumentForResponse(value[0], fieldName);
        Object.assign(flattened, flattenedFirst);
      } else {
        flattened[fieldName] = JSON.stringify(value);
      }
    } else if (typeof value === 'object') {
      // Recursively flatten nested objects
      const flattenedNested = flattenDocumentForResponse(value, fieldName);
      Object.assign(flattened, flattenedNested);
    } else {
      // Regular field
      flattened[fieldName] = value;
    }
  });

  return flattened;
}
