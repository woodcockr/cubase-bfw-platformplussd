# Duktape JavaScript Engine Compatibility Notes

Cubase uses the [Duktape](https://duktape.org/) JavaScript engine to execute MIDI Remote scripts. Duktape is a lightweight embeddable JavaScript engine that targets ES5/ES5.1 compatibility. While generally compatible with standard JavaScript, there are some important differences and limitations to be aware of when developing Cubase MIDI Remote scripts.

## Known Issues and Workarounds

### Function.prototype.call() with Stored Function References

**Issue:** Using `.call()` or `.apply()` on stored function references can cause a `DukValue is uninitialized` runtime error in Cubase.

**Example that FAILS:**
```typescript
const originalHandler = subPage.mOnActivate;

subPage.mOnActivate = function(activeDevice, activeMapping) {
  // This causes: DukValue is uninitialized error
  originalHandler.call(this, activeDevice, activeMapping);

  // Additional logic...
};
```

**Also FAILS:**
```typescript
const originalHandler = subPage.mOnActivate;

subPage.mOnActivate = (activeDevice, activeMapping) => {
  // This also causes: DukValue is uninitialized error
  originalHandler(activeDevice, activeMapping);

  // Additional logic...
};
```

**Workaround:** Instead of trying to chain or call stored function references, inline the required logic directly:

```typescript
subPage.mOnActivate = (activeDevice, activeMapping) => {
  // Directly replicate what the original handler did
  console.log('Activation message');
  globalBooleanVariables.someVar.set(activeDevice, true);
  globalBooleanVariables.otherVar.toggle(activeDevice);

  // Add your custom logic
  device.lcdManager.setChannelText(activeDevice, 0, 0, 'Custom');
};
```

**Root Cause:** The issue appears to stem from how Duktape manages object references and function closures. When TypeScript/JavaScript attempts to store and later invoke a function reference that was originally created by the Cubase API, Duktape may lose track of the internal object references needed to execute that function.

**Related Code:** See [src/shift.ts](src/shift.ts) for the working implementation that avoids this issue.

---

## General Duktape Compatibility Guidelines

### 1. Target ES5 Compatibility

Cubase's Duktape engine targets ES5/ES5.1. While our build process transpiles TypeScript to ES5, be aware of these limitations:

- No `let` or `const` in the runtime (transpiler handles this)
- No arrow functions in the runtime (transpiler handles this)
- No template literals in the runtime (transpiler handles this)
- No destructuring in the runtime (transpiler handles this)
- Limited ES6+ features

### 2. Avoid Complex Function Reference Patterns

- **DON'T** store and later invoke Cubase API function references
- **DON'T** use `.call()`, `.apply()`, or `.bind()` on stored Cubase API functions
- **DO** directly inline logic when extending or replacing Cubase API handlers
- **DO** use arrow functions for your own callbacks (transpiler will handle it)

### 3. Use Simple Variable References

Cubase API objects (like `MR_SubPage`, `MR_ActiveDevice`, etc.) should be used directly rather than through complex reference chains:

```typescript
// GOOD: Direct usage
subPage.mOnActivate = (device, mapping) => {
  device.doSomething();
};

// RISKY: Storing and calling Cubase API functions
const originalFunc = subPage.mOnActivate;
originalFunc(device, mapping); // May cause issues
```

### 4. Logging and Debugging

Cubase provides `console.log()` for debugging. Use it liberally to trace execution flow:

```typescript
console.log('Debug message: ' + variableName);
```

**Note:** String concatenation with `+` is more reliable than template literals for debugging in edge cases.

---

## Build Configuration

Our project uses `tsup` to transpile TypeScript to ES5-compatible JavaScript:

```json
// tsup.config.ts
{
  target: 'es5',
  format: 'cjs'
}
```

This ensures that modern TypeScript features are transpiled to code that Duktape can execute.

---

## Testing Recommendations

1. **Always test in Cubase** - Code that works in Node.js or browsers may fail in Duktape
2. **Check the Console** - Cubase's MIDI Remote Console shows runtime errors and log messages
3. **Incremental Changes** - Test frequently when modifying Cubase API integration code
4. **Build and Deploy** - Always rebuild (`npm run build`) before copying to Cubase

---

## Resources

- [Duktape Documentation](https://duktape.org/)
- [Duktape Wiki](https://github.com/svaarala/duktape/wiki)
- [ES5 Specification](https://262.ecma-international.org/5.1/)
- Cubase MIDI Remote API Documentation (in Cubase installation)

---

## Contributing

If you discover additional Duktape compatibility issues or workarounds, please document them in this file.
