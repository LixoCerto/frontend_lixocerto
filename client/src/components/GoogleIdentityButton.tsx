import { useEffect, useRef, useState } from "react";

type RespostaCredencialGoogle = { credential?: string };
type OpcoesBotaoGoogle = {
  type: "standard";
  theme: "outline";
  size: "large";
  text: "continue_with";
  shape: "rectangular";
  logo_alignment: "left";
  locale: string;
  width: number;
};

type ApiGoogleIdentity = {
  accounts: {
    id: {
      initialize: (opcoes: {
        client_id: string;
        nonce: string;
        auto_select: false;
        callback: (resposta: RespostaCredencialGoogle) => void;
      }) => void;
      renderButton: (elemento: HTMLElement, opcoes: OpcoesBotaoGoogle) => void;
    };
  };
};

declare global {
  interface Window {
    google?: ApiGoogleIdentity;
  }
}

let scriptGoogleEmAndamento: Promise<void> | null = null;
let clientIdGoogleInicializado: string | null = null;
let callbackCredencialAtivo: ((credential: string) => void) | null = null;

function carregarGoogleIdentity(): Promise<void> {
  if (window.google?.accounts.id) return Promise.resolve();
  if (scriptGoogleEmAndamento) return scriptGoogleEmAndamento;

  scriptGoogleEmAndamento = new Promise((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>("script[data-lcr-google-identity]");
    if (!script) {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.lcrGoogleIdentity = "true";
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => {
      scriptGoogleEmAndamento = null;
      reject(new Error("Não foi possível carregar o login do Google."));
    }, { once: true });
  });
  return scriptGoogleEmAndamento;
}

export function GoogleIdentityButton({
  clientId,
  nonce,
  disabled = false,
  onCredential,
}: {
  clientId: string;
  nonce: string;
  disabled?: boolean;
  onCredential: (credential: string) => void;
}) {
  const elementoRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const [erroCarregamento, setErroCarregamento] = useState(false);
  callbackRef.current = onCredential;

  useEffect(() => {
    let desmontado = false;
    const callbackAtivo = (credential: string) => callbackRef.current(credential);
    callbackCredencialAtivo = callbackAtivo;

    void carregarGoogleIdentity().then(() => {
      if (desmontado || !elementoRef.current || !window.google?.accounts.id) return;
      if (clientIdGoogleInicializado !== clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          nonce,
          auto_select: false,
          callback: (resposta) => {
            if (resposta.credential) callbackCredencialAtivo?.(resposta.credential);
          },
        });
        clientIdGoogleInicializado = clientId;
      }

      const largura = Math.min(Math.max(elementoRef.current.clientWidth, 120), 400);
      elementoRef.current.replaceChildren();
      window.google.accounts.id.renderButton(elementoRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
        locale: "pt-BR",
        width: largura,
      });
      setErroCarregamento(false);
    }).catch(() => {
      if (!desmontado) setErroCarregamento(true);
    });

    return () => {
      desmontado = true;
      if (callbackCredencialAtivo === callbackAtivo) callbackCredencialAtivo = null;
      elementoRef.current?.replaceChildren();
    };
  }, [clientId, nonce]);

  return (
    <div>
      <div
        ref={elementoRef}
        className={`flex min-h-11 justify-center ${disabled ? "pointer-events-none opacity-60" : ""}`}
        aria-busy={disabled}
      />
      {erroCarregamento ? <p role="status" className="mt-2 text-center text-xs text-[#a8493e">Não foi possível carregar o login do Google. Tente novamente.</p> : null}
    </div>
  );
}
