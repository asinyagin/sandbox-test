var fs = require('fs');
var assert = require('assert');
var solc = require('solc');
var Sandbox = require('ethereum-sandbox-client');

describe('Contract', function() {
  this.timeout(60000);

  
  var sandbox = new Sandbox('http://localhost:8554');
  var compiled = compile('contracts', ['contract.sol']);
  var contract;
  
  before(function(done) {
    sandbox.start(function(err) {
      if (err) return done(err);
  
      contract = sandbox.web3.eth.contract(JSON.parse(compiled.contracts['Contract'].interface)).new({
        data: '0x' + compiled.contracts['Contract'].bytecode
      }, function(err, created) {
        if (err) return done(err);
        if (created.address) done();
      });
    });
  });
  
  it('prints string', function (done) {
    var str = "hello, ethereum!";
    
    console.log('in the test');
    
    var filter = sandbox.web3.eth.filter({
      address: contract.address
    });
    filter.watch(function(err, val) {
      if (err) return finish(err);
      assert.equal(toString(val.data), str);
      finish();
    });
    
    contract.test(str, function(err) {
      if (err) finish(err);
    });
    
    function finish(err) {
      filter.stopWatching();
      done(err);
    }
  });
  
  after(function(done) {
    sandbox.stop(function(err) {
      done(err);
    });
  });
});

function toString(hex) {
  return String.fromCharCode.apply(
    null,
    toArray(removeTrailingZeroes(hex.substr(2)))
  );
}

function removeTrailingZeroes(str) {
  if (str.length % 2 !== 0)
    console.error('Wrong hex str: ' + str);
  
  var lastNonZeroByte = 0;
  for (var i = str.length - 2; i >= 2; i -= 2) {
    if (str.charAt(i) !== '0' || str.charAt(i + 1) !== '0') {
      lastNonZeroByte = i;
      break;
    }
  }
  
  return str.substr(0, lastNonZeroByte + 2);
}

function toArray(str) {
  if (str.length % 2 !== 0)
    console.error('Wrong hex str: ' + str);
  
  var arr = [];
  for (var i = 0; i < str.length; i += 2) {
    var code = parseInt(str.charAt(i) + str.charAt(i + 1), 16);
    // Ignore non-printable characters
    if (code > 9) arr.push(code);
  }
  
  return arr;
}

function compile(dir, files) {
  var input = {};
  files.forEach(function(file) {
    input[file] = fs.readFileSync(dir + '/' + file).toString();
  });
  return solc.compile({ sources: input }, 1, function findImports(path) {
    try {
      return { contents: fs.readFileSync(dir + '/' + path).toString() };
    } catch (e) {
      return { error: e };
    }
  });
}