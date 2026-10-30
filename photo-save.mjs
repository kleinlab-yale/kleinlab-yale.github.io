// Open only the device's save/share UI; never select a destination automatically.
export async function choosePhotoDestination(file, sharing = globalThis.navigator) {
  try {
    if (!sharing?.share || !sharing?.canShare?.({ files: [file] })) return 'preview';
    await sharing.share({ files: [file] });
    return 'shared';
  } catch (failure) {
    return failure.name === 'AbortError' ? 'cancelled' : 'preview';
  }
}
