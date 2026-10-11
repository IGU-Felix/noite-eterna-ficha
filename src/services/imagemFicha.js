const TAMANHO_PRESERVAR = 512 * 1024
const DIMENSAO_MAXIMA = 1600

export function prepararImagemFicha(file) {
  if (!file) return Promise.resolve(null)
  if (file.size <= TAMANHO_PRESERVAR) return lerComoDataUrl(file)

  return new Promise((resolve, reject) => {
    lerComoDataUrl(file)
      .then(dataUrl => {
        const imagem = new Image()
        imagem.onload = () => {
          const escala = Math.min(
            1,
            DIMENSAO_MAXIMA / Math.max(imagem.naturalWidth, imagem.naturalHeight)
          )
          const largura = Math.max(1, Math.round(imagem.naturalWidth * escala))
          const altura = Math.max(1, Math.round(imagem.naturalHeight * escala))
          const canvas = document.createElement("canvas")
          canvas.width = largura
          canvas.height = altura
          const contexto = canvas.getContext("2d")
          if (!contexto) {
            reject(new Error("Não foi possível preparar a imagem da ficha."))
            return
          }

          contexto.fillStyle = "#111"
          contexto.fillRect(0, 0, largura, altura)
          contexto.drawImage(imagem, 0, 0, largura, altura)
          resolve(canvas.toDataURL("image/jpeg", 0.82))
        }
        imagem.onerror = () => reject(new Error("Não foi possível ler a imagem selecionada."))
        imagem.src = dataUrl
      })
      .catch(reject)
  })
}

function lerComoDataUrl(file) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => {
      if (typeof leitor.result === "string") {
        resolve(leitor.result)
      } else {
        reject(new Error("Não foi possível ler a imagem selecionada."))
      }
    }
    leitor.onerror = () => reject(new Error("Não foi possível ler a imagem selecionada."))
    leitor.readAsDataURL(file)
  })
}
