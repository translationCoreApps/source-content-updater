import fs from 'fs-extra';
import path from 'path-extra';
// heleprs
import * as ResourcesHelpers from '../ResourcesHelpers';

/**
 * @description Processes the extracted files for translationWord to cerate the folder
 * structure and produce the index.js file for the language with the title of each article.
 * @param {String} extractedFilesPath - Path to the extracted files that came from the zip file from the catalog
 * @param {String} outputPath - Path to place the processed resource files WIHTOUT the version in the path
 * @return {String} Path to the processed translationWords files with version
 */
export function processTranslationWords(extractedFilesPath, outputPath) {
  if (!fs.pathExistsSync(extractedFilesPath)) {
    return null;
  }
  const version = ResourcesHelpers.getVersionFromManifest(extractedFilesPath);
  if (version === null) {
    return null;
  }
  const twOutputPath = path.join(outputPath, 'v' + version);
  if (fs.pathExistsSync(twOutputPath)) {
    fs.removeSync(twOutputPath);
  }
  const typesPath = path.join(extractedFilesPath, 'bible');
  const isDirectory = item => fs.lstatSync(path.join(typesPath, item)).isDirectory();
  const typeDirs = fs.readdirSync(typesPath).filter(isDirectory);
  typeDirs.forEach(typeDir => {
    const typePath = path.join(typesPath, typeDir);
    const files = fs.readdirSync(typePath).filter(filename => path.extname(filename) === '.md');
    generateGroupsIndex(typePath, twOutputPath, typeDir);
    files.forEach(fileName => {
      const sourcePath = path.join(typePath, fileName);
      const destinationPath = path.join(
        twOutputPath,
        typeDir,
        'articles',
        fileName,
      );
      fs.copySync(sourcePath, destinationPath);
    });
  });
  return twOutputPath;
}

/**
 * @description - Generates the groups index for the tw articles (both kt, other and names).
 * @param {String} filesPath - Path to all tw markdown artciles.
 * @param {String} twOutputPath Path to the resource location in the static folder.
 * @param {String} folderName article type. ex. kt or other.
 */
function generateGroupsIndex(filesPath, twOutputPath, folderName) {
  let groupsIndex = [];
  let groupIds = fs.readdirSync(filesPath).filter(filename => {
    return filename.split('.').pop() === 'md';
  });
  groupIds.forEach(fileName => {
    let groupObject = {};
    const filePath = path.join(filesPath, fileName);
    const articleFile = fs.readFileSync(filePath, 'utf8');
    const groupId = fileName.replace('.md', '');
    // get the article's first line and remove #'s and spaces from beginning/end
    const groupName = articleFile.split('\n')[0].replace(/(^\s*#\s*|\s*#\s*$)/gi, '');
    groupObject.id = groupId;
    groupObject.name = groupName;
    groupsIndex.push(groupObject);
  });
  groupsIndex.sort(compareByFirstUniqueWord);
  const groupsIndexOutputPath = path.join(
    twOutputPath,
    folderName,
    'index.json',
  );

  fs.outputJsonSync(groupsIndexOutputPath, groupsIndex, {spaces: 2});
}

/**
 * Splits the string into words delimited by commas and compares the first unique word
 * @param {String} a first string to be compared
 * @param {String} b second string to be compared
 * @return {int} comparison result
 */
function compareByFirstUniqueWord(a, b) {
  let aWords = a.name.toUpperCase().split(',');
  let bWords = b.name.toUpperCase().split(',');
  while (aWords.length || bWords.length) {
    if (!aWords.length)
      return -1;
    if (!bWords.length)
      return 1;
    let aWord = aWords.shift().trim();
    let bWord = bWords.shift().trim();
    if (aWord !== bWord)
      return (aWord < bWord ? -1 : 1);
  }
  return 0; // both lists are the same
}
