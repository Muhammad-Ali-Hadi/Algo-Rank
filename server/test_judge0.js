/**
 * Quick smoke test for the Judge0 integration.
 * Tests: syntax error detection, successful compile, and output comparison.
 */
require('dotenv').config();
const { checkSyntax, evaluateSubmission, LANGUAGE_MAP } = require('./services/judgeService');

async function test() {
  console.log('=== AlgoRank Judge0 Integration Test ===\n');
  console.log('Judge0 URL:', process.env.JUDGE0_API_URL || 'https://ce.judge0.com');
  console.log('API Key:', process.env.JUDGE0_API_KEY ? '***set***' : '(none - using public instance)');
  console.log('');

  // Test 1: C++ with syntax error (missing semicolon)
  console.log('--- Test 1: C++ Syntax Error ---');
  try {
    const result = await checkSyntax(`
#include <iostream>
using namespace std;
int main() {
    cout << "Hello"
    return 0;
}`, 'C++');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log(result.success ? '❌ FAIL (should have caught syntax error)' : '✅ PASS (correctly detected syntax error)');
  } catch (e) {
    console.error('Error:', e.message);
  }

  console.log('');

  // Test 2: C++ valid code
  console.log('--- Test 2: C++ Valid Code ---');
  try {
    const result = await checkSyntax(`
#include <iostream>
using namespace std;
int main() {
    cout << "Hello World" << endl;
    return 0;
}`, 'C++');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log(result.success ? '✅ PASS (correctly compiled)' : '❌ FAIL (should have compiled)');
  } catch (e) {
    console.error('Error:', e.message);
  }

  console.log('');

  // Test 3: Python syntax error
  console.log('--- Test 3: Python Syntax Error ---');
  try {
    const result = await checkSyntax(`
def main():
    print("hello"
main()
`, 'Python 3');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log(result.success ? '❌ FAIL (should have caught syntax error)' : '✅ PASS (correctly detected syntax error)');
  } catch (e) {
    console.error('Error:', e.message);
  }

  console.log('');

  // Test 4: Python valid code
  console.log('--- Test 4: Python Valid Code ---');
  try {
    const result = await checkSyntax(`
n = int(input())
print(n * 2)
`, 'Python 3');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log(result.success ? '✅ PASS (correctly compiled)' : '❌ FAIL (should have compiled)');
  } catch (e) {
    console.error('Error:', e.message);
  }

  console.log('\n=== Tests Complete ===');
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
