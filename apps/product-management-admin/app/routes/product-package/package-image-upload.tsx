import { useEffect, useState } from "react";
import styles from "./product-package.module.css";

const acceptedImageTypes = "image/png,image/jpeg,image/webp";

/**
 * Render an accessible package-image picker with immediate local preview.
 *
 * @param props - Current image, product name, and optional validation error.
 * @returns Package-image upload fieldset.
 */
export function PackageImageUpload({ error, imageUrl, productName }: { readonly error?: string; readonly imageUrl: string | null; readonly productName: string }): React.ReactNode {
  const [previewUrl, setPreviewUrl] = useState<string | null>(imageUrl);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => {
    return () => {
      if (objectUrl !== null) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  /**
   * Replace the preview with the selected local image.
   *
   * @param event - File input change event.
   * @returns Nothing.
   */
  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.currentTarget.files?.[0];
    if (objectUrl !== null) URL.revokeObjectURL(objectUrl);
    if (file === undefined) {
      setObjectUrl(null);
      setPreviewUrl(removeImage ? null : imageUrl);
      return;
    }
    const nextObjectUrl = URL.createObjectURL(file);
    setObjectUrl(nextObjectUrl);
    setPreviewUrl(nextObjectUrl);
    setRemoveImage(false);
  }

  /**
   * Toggle explicit removal of the currently stored image.
   *
   * @param event - Removal checkbox change event.
   * @returns Nothing.
   */
  function handleRemoveChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const checked = event.currentTarget.checked;
    setRemoveImage(checked);
    setPreviewUrl(checked ? null : objectUrl ?? imageUrl);
  }

  return (
    <fieldset className={styles.imageUploadFieldset}>
      <legend className={styles.sectionTitle}>Afbeelding van de verpakking</legend>
      {previewUrl === null ? (
        <div className={styles.imageUploadPlaceholder}>Nog geen afbeelding gekozen</div>
      ) : (
        <img className={styles.imageUploadPreview} src={previewUrl} alt={`Voorbeeld van de verpakking van ${productName}`} />
      )}
      <label className={styles.imagePicker}>
        <span>PNG, JPEG of WebP kiezen</span>
        <input accept={acceptedImageTypes} name="packageImage" onChange={handleImageChange} type="file" />
      </label>
      <p className={styles.imageHelp}>Maximaal 5 MB. De bestandsinhoud wordt op de server gecontroleerd.</p>
      {imageUrl === null ? null : (
        <label className={styles.removeImageChoice}>
          <input checked={removeImage} name="removeImage" onChange={handleRemoveChange} type="checkbox" />
          <span>Huidige afbeelding verwijderen</span>
        </label>
      )}
      {error ? <span className={styles.imageError}>{error}</span> : null}
    </fieldset>
  );
}
