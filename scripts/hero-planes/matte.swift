// Person matte with Apple Vision (accurate person segmentation).
// usage: matte <in.png> <out-mask.png> writes a grayscale mask at the input size.
import Foundation
import Vision
import CoreImage
import AppKit

let args = CommandLine.arguments
let url = URL(fileURLWithPath: args[1])
guard let ci = CIImage(contentsOf: url) else { fatalError("read") }
let req = VNGeneratePersonSegmentationRequest()
req.qualityLevel = .accurate
req.outputPixelFormat = kCVPixelFormatType_OneComponent8
let handler = VNImageRequestHandler(ciImage: ci, options: [:])
try handler.perform([req])
guard let buf = req.results?.first?.pixelBuffer else { fatalError("no result") }
var mask = CIImage(cvPixelBuffer: buf)
let sx = ci.extent.width / mask.extent.width, sy = ci.extent.height / mask.extent.height
mask = mask.transformed(by: CGAffineTransform(scaleX: sx, y: sy))
let ctx = CIContext()
let cs = CGColorSpace(name: CGColorSpace.linearGray)!
try ctx.writePNGRepresentation(of: mask, to: URL(fileURLWithPath: args[2]), format: .L8, colorSpace: cs)
print("ok", mask.extent)
