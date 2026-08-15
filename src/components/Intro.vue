<template>
    <div class="intro-tela" @click="entrar">

        <!-- FLORESTA (camadas de profundidade) -->
        <div class="intro-fundo"></div>

        <!-- GRÃO / RUÍDO -->
        <div class="intro-ruido"></div>

        <!-- VINHETA -->
        <div class="intro-vinheta"></div>

        <!-- CONTEÚDO -->
        <div class="intro-conteudo">
            <h1 class="intro-titulo">
                <span>Noite</span>
                <span>Eterna</span>
            </h1>

            <div class="intro-rodape">
                <div class="intro-icones">
                    <button class="intro-icone" title="Mundo" @click.stop="entrar">
                        <img src="/buttons/map-btn.svg" alt="Mundo" />
                    </button>
                    <button class="intro-icone" title="Ameaças" @click.stop="entrar">
                        <img src="/buttons/threat-bnt.svg" alt="Ameaças" />
                    </button>
                    <button class="intro-icone" title="Ficha" @click.stop="entrar">
                        <img src="/buttons/character-btn.svg" alt="Ficha" />
                    </button>
                    <button class="intro-icone" title="Livro de Regras" @click.stop="entrar">
                        <img src="/buttons/book-btn.svg" alt="Livro" />
                    </button>
                    <button class="intro-icone" title="Mestre" @click.stop="entrar">
                        <img src="/buttons/dm-bnt.svg" alt="Mestre" />
                    </button>
                </div>
            </div>
        </div>

    </div>
</template>

<script setup>
import { ref, onMounted } from "vue"

const emit = defineEmits(["entrar"])
const mostrarDica = ref(false)

function entrar() {
    emit("entrar")
}

onMounted(() => {
    setTimeout(() => { mostrarDica.value = true }, 1400)
})
</script>

<style scoped>
.intro-tela {
    position: relative;
    width: 100%;
    height: 100vh;
    background: #0a0a0a;
    overflow: hidden;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: "Aubrey", system-ui;
}

/* ===== FLORESTA ===== */
.intro-fundo {
    position: absolute;
    inset: 0;
    background-image: url("/fundo_noite_eterna.svg");
    background-size: cover;
    background-position: center bottom;
    background-repeat: no-repeat;
}

.floresta {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 46%;
}

.floresta svg {
    width: 100%;
    height: 100%;
    display: block;
}

.floresta path {
    fill: #000;
}

.floresta-longe {
    height: 34%;
    opacity: 0.35;
    filter: blur(1.5px);
    transform: scaleX(1.05);
}

.floresta-meio {
    height: 40%;
    opacity: 0.6;
    filter: blur(0.5px);
    transform: translateX(-2%) scaleX(1.1);
}

.floresta-perto {
    height: 48%;
    opacity: 0.95;
    transform: translateX(3%) scaleX(1.15);
}

/* ===== RUÍDO / GRÃO ===== */
.intro-ruido {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.05;
    mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-repeat: repeat;
}

/* ===== VINHETA ===== */
.intro-vinheta {
    position: absolute;
    inset: 0;
    pointer-events: none;

}

/* ===== CONTEÚDO ===== */
.intro-conteudo {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    height: 100%;
    padding: 40px 20px;
}

.intro-titulo {
    margin-top: 12vh;
    text-align: center;
    line-height: 0.95;
    text-transform: uppercase;
    letter-spacing: 6px;
    font-weight: normal;
    color: #2c2c2c;
    font-size: 56px;
    animation: respirarTitulo 7s ease-in-out infinite;
}

.intro-titulo span {
    display: block;
    text-shadow:
        0 0 18px rgba(255, 255, 255, 0.05),
        0 2px 0 rgba(0, 0, 0, 0.9);
}

@keyframes respirarTitulo {

    0%,
    100% {
        color: #2a2a2a;
    }

    50% {
        color: #3a3a3a;
    }
}

.intro-dica {
    margin-top: 18px;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #666;
    opacity: 0;
    transition: opacity 1s ease;
}

.intro-dica.visivel {
    opacity: 1;
    animation: piscarDica 2.4s ease-in-out infinite;
}

@keyframes piscarDica {

    0%,
    100% {
        opacity: 0.35;
    }

    50% {
        opacity: 0.85;
    }
}

/* ===== RODAPÉ ===== */
.intro-rodape {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
}

.intro-marca {
    font-size: 12px;
    color: #a37bd9;
    letter-spacing: 0.5px;
}

.intro-icones {
    display: flex;
    gap: 8px;
}

.intro-icones {
    display: flex;
    gap: 6px;
}

.intro-icone {
    width: 40px;
    height: 40px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease, filter 0.2s ease;
}

.intro-icone img {
    width: 100%;
    height: 100%;
    display: block;
    filter: brightness(0.85);
    transition: filter 0.2s ease;
}

.intro-icone:hover {
    transform: translateY(-3px);
}

.intro-icone:hover img {
    filter: brightness(1.15) drop-shadow(0 0 8px rgba(241, 241, 239, 0.5));
}
</style>