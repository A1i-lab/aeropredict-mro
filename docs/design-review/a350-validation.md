# Local A350 validation

Recovery: `recovery/a320neo-426599f` points to `426599fa8eaa82dc7d9a66b2245c157541c59727`.

- Nine JavaScript tests pass: asset structure, finite geometry, independent fan meshes and local textures, depth ordering, continuous camera progress and prediction behavior.
- Twelve Python tests pass, including all classic application pages, NASA data integrity and external aircraft packaging.
- Production Vite build and Streamlit packaging succeed. Vite still reports the existing large application-code chunk warning.
- Packaged HTML: 1,730,470 bytes. Aircraft gzip: 2,789,497 bytes, 4,882,476 bytes decompressed; 74,441 triangles.
- Local Streamlit HTTP endpoint returned 200, application/gzip, no Content-Encoding; response bytes exactly match the model and decompress to glTF. A test server bound explicitly to 127.0.0.1 was used after the default-address server was unreachable from the checking process.
- `a350-review.png` shows offline CPU-rendered viewpoints from the converted asset. This verifies shape and texture placement, not browser GPU performance.
- Camera timeline, detailed engine, page transition controller and prediction implementation are unchanged from the recovery commit. New exterior targets and ground height are adapted to the A350.

Browser interaction, GPU rendering, remote Git state and production deployment require separate verification. Local tests do not establish publication success.
