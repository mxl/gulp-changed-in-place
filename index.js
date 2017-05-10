var crypto = require('crypto');
var through = require('through2');

var GLOBAL_CACHE = {};

// look for changes by mtime
function processFileByModifiedTime(stream, force, file, cache) {
  var newTime = file.stat && file.stat.mtime;
  var oldTime = cache[file.path];

  cache[file.path] = newTime.getTime();

  if (force || !oldTime || oldTime !== newTime.getTime()) {
    stream.push(file);
  }
}

// look for changes by sha1 hash
function processFileBySha1Hash(stream, force, file, cache) {
  // null cannot be hashed
  if (file.contents === null) {
    // if element is really a file, something weird happened, but it's safer
    // to assume it was changed (because we cannot said that it wasn't)
    // if it's not a file, we don't care, do we? does anybody transform directories?
    if (file.stat.isFile()) {
      stream.push(file);
    }
  } else {
    var newHash = crypto.createHash('sha1').update(file.contents).digest('hex');
    var currentHash = cache[file.path];

    cache[file.path] = newHash;

    if (force || !currentHash || currentHash !== newHash) {
      stream.push(file);
    }
  }
}

module.exports = function (options) {
  options = options || {};

  var processFile;

  switch (options.howToDetermineDifference) {
    case 'hash':
      processFile = processFileBySha1Hash;
      break;
    case 'modification-time':
      processFile = processFileByModifiedTime;
      break;
    default:
      processFile = processFileBySha1Hash;
  }

  var cache = options.cache || GLOBAL_CACHE;
  var force = options.force === true;

  return through.obj(function (file, encoding, callback) {
    processFile(this, force, file, cache);
    callback();
  });
}
