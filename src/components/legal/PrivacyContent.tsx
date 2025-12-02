import React from 'react';

interface PrivacyContentProps {
  language: 'en' | 'es' | 'pt';
}

export const PrivacyContent: React.FC<PrivacyContentProps> = ({ language }) => {

  const contentES = (
    <div className="space-y-4 text-justify text-slate-600 dark:text-slate-300">
      <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
        POLÍTICA DE PRIVACIDAD DE CLINISCRIBE PARA PRESTADORES DE SALUD
      </h2>

      <p>Fecha de entrada en vigor: 28 de noviembre de 2025</p>

      <p>
        La presente Política de Privacidad (la “Política”) describe cómo CliniScribe (en adelante, “CliniScribe”, “nosotros” o “nuestro”) trata los datos personales de los profesionales y prestadores de salud que utilizan el servicio disponible, entre otros, en https://www.cliniscribe.io y en la subruta https://www.cliniscribe.io/providers (en conjunto, el “Servicio”).
      </p>

      <p>
        Al crear una cuenta o utilizar el Servicio, usted (“el Usuario”, “el Profesional” o “el Prestador”) declara haber leído y comprendido esta Política.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        1. ¿Quién es el responsable del tratamiento?
      </h3>

      <p>A efectos de los datos personales de los profesionales/usuarios del Servicio, el responsable del tratamiento es:</p>

      <p>
        SiemprePro SpA<br />
        RUT: 78.117.275-8<br />
        Domicilio: Cerro el Plomo 5931, oficina 1213, Las Condes, Región Metropolitana, Chile<br />
        Correo de contacto: support@cliniscribe.io
      </p>

      <p>
        En relación con los datos de pacientes que el Profesional introduce o hace procesar a través del Servicio, CliniScribe actúa como proveedor tecnológico y, en términos de protección de datos, como encargado de tratamiento (o figura equivalente según la normativa aplicable). El responsable del tratamiento de los datos de los pacientes es siempre el Profesional o la institución de salud para la que trabaja.
      </p>

      <p>
        Esta Política se aplica a los datos tratados por CliniScribe con independencia del país desde el que los profesionales accedan al Servicio. En caso de conflicto entre esta Política y normas imperativas de protección de datos de una jurisdicción concreta, prevalecerán estas últimas en lo que corresponda.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        2. ¿A quién se aplica esta Política?
      </h3>

      <p>Esta Política se aplica a:</p>

      <p>
        Profesionales y prestadores de salud que se registran y usan CliniScribe.
      </p>
      <p>
        Usuarios que visitan el sitio web asociado al Servicio (por ejemplo, https://www.cliniscribe.io y sus subrutas), en la medida en que se recojan datos personales.
      </p>
      <p>
        No está dirigida al público general ni a pacientes. Los datos de pacientes se procesan únicamente por cuenta del Profesional, bajo su responsabilidad.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        3. ¿Qué datos tratamos?
      </h3>

      <h4 className="font-semibold text-slate-900 dark:text-white">
        3.1 Datos de los profesionales/usuarios
      </h4>

      <p>Podemos tratar las siguientes categorías de datos sobre el Profesional:</p>

      <p>
        Datos identificatorios básicos: nombre, apellidos, país, especialidad u ocupación, institución o centro de salud donde trabaja (si corresponde).
      </p>
      <p>
        Datos de contacto: correo electrónico, número de teléfono (si se facilita).
      </p>
      <p>
        Datos de cuenta: nombre de usuario, contraseña cifrada, idioma preferido y ajustes del perfil.
      </p>
      <p>
        Datos profesionales: información sobre la profesión o rol (por ejemplo, médico general, especialista, psicólogo, etc.) y cualquier otro dato que usted decida incorporar voluntariamente en su perfil o comunicaciones.
      </p>

      <h4 className="font-semibold text-slate-900 dark:text-white mt-2">
        3.2 Datos técnicos y de uso del Servicio
      </h4>

      <p>
        De forma automática, al usar el Servicio podemos recoger:
      </p>

      <p>
        Dirección IP, identificadores de dispositivo, sistema operativo, tipo de navegador.
      </p>
      <p>
        Fechas y horas de acceso, páginas visitadas, botones utilizados, errores de sistema.
      </p>
      <p>
        Información básica de uso del Servicio (por ejemplo, número de sesiones, volumen de consultas realizadas, idioma de uso, tipo de funcionalidad más utilizada), en forma agregada o pseudonimizada siempre que sea posible.
      </p>

      <p>
        Estos datos se usan principalmente para fines de seguridad, mantenimiento y mejora del Servicio.
      </p>

      <h4 className="font-semibold text-slate-900 dark:text-white mt-2">
        3.3 Datos de pacientes procesados por cuenta del Profesional
      </h4>

      <p>
        En la medida en que el Profesional utilice el Servicio con casos reales, el procesamiento de datos de pacientes puede incluir:
      </p>

      <p>
        Audio de la consulta o fragmentos de audio que el Profesional decide capturar.
      </p>
      <p>
        Texto introducido por el Profesional, como notas manuales, descripciones clínicas o recordatorios.
      </p>
      <p>
        Por el propio contenido de la consulta, este material puede contener datos personales y datos sensibles de salud.
      </p>

      <p>
        No obstante, CliniScribe ha sido diseñada bajo un enfoque “privacy-first”, y en la versión actual del Servicio se aplica lo siguiente:
      </p>

      <p>
        CliniScribe NO almacena de manera persistente en la nube las notas clínicas, transcripciones completas ni el contenido detallado de las consultas de los pacientes.
      </p>
      <p>
        El contenido clínico generado (borradores de notas, resúmenes, formato SOAP) permanece principalmente en el navegador del Profesional, de manera temporal, para que este pueda revisarlo, editarlo y luego copiarlo o integrarlo en su propio sistema de ficha clínica.
      </p>
      <p>
        Para poder generar respuestas de IA, fragmentos de audio y texto pueden ser procesados de forma temporal y cifrada por proveedores tecnológicos de inteligencia artificial e infraestructura (ver sección 6), pero CliniScribe no utiliza estos datos para entrenar modelos ni para otros fines distintos de la prestación puntual del Servicio.
      </p>
      <p>
        El Profesional es responsable de no introducir datos de pacientes que sean innecesarios o excesivos para el propósito clínico.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        4. ¿Con qué finalidades usamos los datos?
      </h3>

      <h4 className="font-semibold text-slate-900 dark:text-white">
        4.1 Datos de los profesionales
      </h4>

      <p>Tratamos los datos de los profesionales con las siguientes finalidades principales:</p>

      <p><strong>Prestación del Servicio</strong></p>

      <p>
        Crear y administrar su cuenta.
      </p>
      <p>
        Permitir su acceso a la plataforma y funcionalidades (por ejemplo, generación de borradores de notas, configuración de idioma).
      </p>
      <p>
        Gestionar incidencias técnicas, soporte y comunicación con el usuario.
      </p>
      <p>
        Base legal: ejecución del contrato o relación precontractual al registrarse y usar el Servicio.
      </p>

      <p><strong>Comunicaciones relacionadas con el Servicio</strong></p>

      <p>
        Envío de avisos técnicos, actualizaciones, cambios en los Términos y en esta Política.
      </p>
      <p>
        Comunicaciones sobre seguridad, interrupciones o mejoras críticas.
      </p>
      <p>
        Base legal: ejecución del contrato e interés legítimo en mantener la continuidad y seguridad del Servicio.
      </p>

      <p><strong>Mejora y desarrollo del Servicio</strong></p>

      <p>
        Análisis anónimo o agregado de patrones de uso (por ejemplo, qué módulos se usan más, tiempos de respuesta, métricas de rendimiento).
      </p>
      <p>
        Investigación y desarrollo interno para mejorar funcionalidades, experiencia de uso y rendimiento.
      </p>
      <p>
        Base legal: interés legítimo en optimizar el Servicio, siempre respetando la privacidad y, cuando sea posible, usando datos agregados o anonimizados.
      </p>

      <p><strong>Cumplimiento de obligaciones legales</strong></p>

      <p>
        Atención de requerimientos de autoridades.
      </p>
      <p>
        Cumplimiento de obligaciones contables, tributarias o regulatorias que pudieran corresponder.
      </p>
      <p>
        Base legal: cumplimiento de obligaciones legales del responsable.
      </p>

      <h4 className="font-semibold text-slate-900 dark:text-white mt-2">
        4.2 Datos de pacientes (procesados por cuenta del Profesional)
      </h4>

      <p>
        En relación con los datos de pacientes que el Profesional introduce a través del Servicio:
      </p>

      <p>
        La finalidad del tratamiento por parte de CliniScribe es exclusivamente técnica y limitada: transformar audio y texto en borradores de notas clínicas que el Profesional revisa y valida.
      </p>
      <p>
        CliniScribe no decide ni define la finalidad clínica (diagnóstico, tratamiento, seguimiento) ni la base legal para el tratamiento de esos datos: eso corresponde al Profesional o a la institución de salud.
      </p>
      <p>
        CliniScribe no utiliza los datos de pacientes:
      </p>
      <p>
        Para entrenar modelos de terceros.
      </p>
      <p>
        Para entrenar modelos propios de manera que permita identificar pacientes.
      </p>
      <p>
        Para fines comerciales, de marketing o de explotación independiente.
      </p>
      <p>
        La base legal respecto de los pacientes es la que determine el Profesional como responsable del tratamiento (por ejemplo, consentimiento o habilitaciones previstas en la normativa sanitaria aplicable).
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        5. ¿Durante cuánto tiempo conservamos los datos?
      </h3>

      <h4 className="font-semibold text-slate-900 dark:text-white">
        5.1 Datos de profesionales
      </h4>

      <p>
        Conservamos los datos de cuenta y contacto del Profesional mientras su cuenta esté activa y mientras sea necesario para la prestación del Servicio.
      </p>
      <p>
        Una vez solicitada la cancelación de la cuenta, podremos conservar cierta información mínima (por ejemplo, datos de facturación o registros de acceso) durante los plazos necesarios para:
      </p>
      <p>
        Cumplir obligaciones legales.
      </p>
      <p>
        Defendernos frente a posibles reclamaciones, dentro de los plazos de prescripción aplicables.
      </p>
      <p>
        Posteriormente, los datos serán eliminados o anonimizados.
      </p>

      <h4 className="font-semibold text-slate-900 dark:text-white mt-2">
        5.2 Datos clínicos de pacientes
      </h4>

      <p>
        CliniScribe no almacena de forma persistente las notas clínicas ni las transcripciones completas en sus servidores.
      </p>
      <p>
        El contenido clínico detallado se mantiene en el navegador del Profesional, y su permanencia depende de la configuración del propio navegador, caché y decisiones del usuario.
      </p>
      <p>
        El procesamiento por proveedores de IA e infraestructura es temporal y limitado al tiempo necesario para generar la respuesta.
      </p>
      <p>
        La conservación de la documentación clínica final corresponde al Profesional o a su institución, en sus propios sistemas (ficha clínica, EMR u otros).
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        6. Proveedores, subencargados y transferencias internacionales
      </h3>

      <h4 className="font-semibold text-slate-900 dark:text-white">
        6.1 Proveedores tecnológicos (subencargados)
      </h4>

      <p>
        Para operar el Servicio, CliniScribe puede recurrir a terceros proveedores de servicios tecnológicos (“Subencargados”), incluyendo:
      </p>

      <p>
        Proveedores de infraestructura en la nube.
      </p>
      <p>
        Servicios de transcripción de audio y modelos de lenguaje de IA.
      </p>
      <p>
        Proveedores de autenticación, bases de datos y monitoreo de errores.
      </p>

      <p>
        Estos proveedores pueden tratar datos personales únicamente para prestar servicios a CliniScribe y bajo nuestras instrucciones contractuales, incluyendo obligaciones de confidencialidad, seguridad y no uso para fines propios.
      </p>

      <p>
        La lista actualizada de los principales proveedores y subencargados podrá estar disponible en la documentación del producto o en el Sitio, y podrá modificarse en el tiempo para mejorar el Servicio, manteniendo estándares de seguridad equivalentes o superiores.
      </p>

      <h4 className="font-semibold text-slate-900 dark:text-white mt-2">
        6.2 Transferencias internacionales de datos
      </h4>

      <p>
        Algunos de estos proveedores pueden encontrarse o tratar datos en países distintos al del Profesional.
      </p>

      <p>
        Al utilizar el Servicio, el Profesional entiende y acepta que:
      </p>

      <p>
        Sus datos y, en la medida necesaria y temporal, los datos de sus pacientes, pueden ser tratados en otros países.
      </p>
      <p>
        CliniScribe exigirá a estos proveedores compromisos contractuales adecuados para garantizar un nivel de protección similar o superior al exigido por la normativa aplicable.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        7. Seguridad de la información
      </h3>

      <p>
        CliniScribe implementa medidas técnicas y organizativas razonables para proteger los datos personales frente a:
      </p>

      <p>
        Acceso, uso o divulgación no autorizados.
      </p>
      <p>
        Pérdida, destrucción o alteración accidental.
      </p>

      <p>
        Entre otras, se utilizan conexiones cifradas (por ejemplo, HTTPS), gestión controlada de accesos internos y buenas prácticas de desarrollo seguro.
      </p>

      <p>
        Sin embargo, ningún sistema es completamente infalible. El Profesional también tiene responsabilidad en:
      </p>

      <p>
        Mantener la confidencialidad de sus credenciales.
      </p>
      <p>
        Utilizar equipos y redes seguras.
      </p>
      <p>
        Aplicar las políticas de seguridad establecidas por su institución de salud.
      </p>

      <p>
        Ante un incidente de seguridad que afecte de forma relevante a los datos, CliniScribe adoptará las medidas razonables para contenerlo y, cuando corresponda, informar al Profesional y a las autoridades competentes según las normas aplicables.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        8. Derechos de los profesionales sobre sus datos
      </h3>

      <p>
        Como Profesional usuario del Servicio, usted puede ejercer, según la normativa aplicable, los siguientes derechos respecto de sus datos personales:
      </p>

      <p>
        Acceso: saber qué datos tratamos sobre usted.
      </p>
      <p>
        Rectificación: solicitar la corrección de datos inexactos o incompletos.
      </p>
      <p>
        Eliminación o cancelación: pedir la eliminación de sus datos cuando ya no sean necesarios para las finalidades indicadas, o cuando así lo permita la ley.
      </p>
      <p>
        Oposición: oponerse a ciertos tratamientos basados en intereses legítimos, en la medida en que la normativa lo permita.
      </p>
      <p>
        Limitación y portabilidad: en los casos y bajo las condiciones previstas por la legislación aplicable.
      </p>

      <p>
        Para ejercer estos derechos, puede contactarnos en:
      </p>

      <p>
        support@cliniscribe.io
      </p>

      <p>
        Es posible que le solicitemos información adicional para verificar su identidad antes de responder a la solicitud.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        9. Datos de pacientes: rol del Profesional y ejercicio de derechos
      </h3>

      <p>
        En relación con los datos personales de pacientes, CliniScribe actúa como proveedor tecnológico/encargado y no tiene una relación directa con los titulares de esos datos.
      </p>

      <p>
        Por ello:
      </p>

      <p>
        Cualquier solicitud de acceso, rectificación, cancelación u oposición presentada por un paciente respecto de sus datos clínicos debe dirigirse al Profesional o institución de salud responsable del tratamiento.
      </p>
      <p>
        Si un paciente se dirigiera directamente a CliniScribe, canalizaremos la solicitud, en la medida de lo posible, al Profesional responsable, o indicaremos al solicitante que contacte con su prestador de salud.
      </p>

      <p>
        El Profesional se compromete a:
      </p>

      <p>
        Contar con una base legal válida para tratar los datos de sus pacientes.
      </p>
      <p>
        Informar adecuadamente a sus pacientes sobre el uso de herramientas tecnológicas como CliniScribe, cuando así lo exija la normativa.
      </p>
      <p>
        Atender los derechos de los titulares de los datos conforme a la legislación aplicable.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        10. Cookies y tecnologías similares
      </h3>

      <p>
        CliniScribe y sus proveedores pueden utilizar cookies y tecnologías similares en el Sitio y en el Servicio para:
      </p>

      <p>
        Mantener la sesión iniciada del Profesional.
      </p>
      <p>
        Recordar ciertas preferencias de configuración.
      </p>
      <p>
        Recabar información estadística agregada sobre el uso de la plataforma.
      </p>

      <p>
        En general, distinguimos entre:
      </p>

      <p>
        Cookies estrictamente necesarias: imprescindibles para el funcionamiento básico del Servicio (por ejemplo, autenticación).
      </p>
      <p>
        Cookies de análisis o rendimiento: ayudan a entender cómo se utiliza el Servicio, siempre que sea posible de manera agregada o anonimizada.
      </p>

      <p>
        El Profesional puede gestionar las cookies desde la configuración de su navegador. Tenga en cuenta que desactivar ciertas cookies puede afectar el funcionamiento del Servicio.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        11. Cambios en esta Política
      </h3>

      <p>
        Podemos actualizar esta Política de Privacidad para reflejar cambios en el Servicio, en la normativa o en nuestras prácticas de tratamiento de datos.
      </p>

      <p>
        Cuando los cambios sean sustanciales, procuraremos informar a los Profesionales mediante un aviso en el Sitio y/o por correo electrónico con una antelación razonable, salvo que la normativa exija una aplicación inmediata.
      </p>

      <p>
        La versión vigente de la Política estará siempre disponible en el Sitio, indicando la fecha de la última actualización. El uso continuado del Servicio después de la entrada en vigor de las modificaciones supondrá la aceptación de la nueva versión.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        12. Contacto
      </h3>

      <p>
        Para cualquier duda relacionada con esta Política o con el tratamiento de sus datos personales, puede contactarnos en:
      </p>

      <p>
        SiemprePro SpA<br />
        Cerro el Plomo 5931, oficina 1213, Las Condes, Región Metropolitana, Chile<br />
        Correo: support@cliniscribe.io
      </p>
    </div>
  );

  const contentEN = (
    <div className="space-y-4 text-justify text-slate-600 dark:text-slate-300">
      <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
        PRIVACY POLICY OF CLINISCRIBE FOR HEALTHCARE PROVIDERS
      </h2>

      <p>Effective date: 28 November 2025</p>

      <p>
        This Privacy Policy (the “Policy”) describes how CliniScribe (“CliniScribe”, “we” or “our”) processes the personal data of healthcare professionals and providers who use the service made available, among others, at https://www.cliniscribe.io and at the sub-path https://www.cliniscribe.io/providers (jointly, the “Service”).
      </p>

      <p>
        By creating an account or using the Service, you (“the User”, “the Professional” or “the Provider”) declare that you have read and understood this Policy.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        1. Who is the data controller?
      </h3>

      <p>For the purposes of the personal data of the professionals/users of the Service, the data controller is:</p>

      <p>
        SiemprePro SpA<br />
        RUT: 78.117.275-8<br />
        Address: Cerro el Plomo 5931, office 1213, Las Condes, Metropolitan Region, Chile<br />
        Contact email: support@cliniscribe.io
      </p>

      <p>
        In relation to patient data that the Professional enters or has processed through the Service, CliniScribe acts as a technology provider and, for data protection purposes, as a data processor (or equivalent figure under the applicable regulations). The data controller of the patients’ data is always the Professional or the healthcare institution for which they work.
      </p>

      <p>
        This Policy applies to the data processed by CliniScribe regardless of the country from which professionals access the Service. In the event of any conflict between this Policy and mandatory data protection rules of a specific jurisdiction, those rules shall prevail to the extent applicable.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        2. To whom does this Policy apply?
      </h3>

      <p>This Policy applies to:</p>

      <p>
        Healthcare professionals and providers who register for and use CliniScribe.
      </p>
      <p>
        Users who visit the website associated with the Service (for example, https://www.cliniscribe.io and its sub-paths), to the extent that personal data are collected.
      </p>
      <p>
        It is not directed at the general public or at patients. Patients’ data are processed only on behalf of the Professional, under their responsibility.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        3. What data do we process?
      </h3>

      <h4 className="font-semibold text-slate-900 dark:text-white">
        3.1 Data of professionals/users
      </h4>

      <p>We may process the following categories of data about the Professional:</p>

      <p>
        Basic identification data: first name, last name, country, specialty or occupation, institution or healthcare center where they work (if applicable).
      </p>
      <p>
        Contact data: email address, telephone number (if provided).
      </p>
      <p>
        Account data: username, encrypted password, preferred language and profile settings.
      </p>
      <p>
        Professional data: information about the profession or role (for example, general practitioner, specialist, psychologist, etc.) and any other data that you voluntarily choose to include in your profile or communications.
      </p>

      <h4 className="font-semibold text-slate-900 dark:text-white mt-2">
        3.2 Technical data and data on use of the Service
      </h4>

      <p>
        Automatically, when using the Service we may collect:
      </p>

      <p>
        IP address, device identifiers, operating system, browser type.
      </p>
      <p>
        Dates and times of access, pages visited, buttons used, system errors.
      </p>
      <p>
        Basic information about use of the Service (for example, number of sessions, volume of consultations carried out, language of use, type of functionality most used), in aggregated or pseudonymized form whenever possible.
      </p>

      <p>
        These data are used mainly for security, maintenance and improvement of the Service.
      </p>

      <h4 className="font-semibold text-slate-900 dark:text-white mt-2">
        3.3 Patient data processed on behalf of the Professional
      </h4>

      <p>
        To the extent that the Professional uses the Service with real cases, the processing of patient data may include:
      </p>

      <p>
        Audio of the consultation or audio fragments that the Professional decides to capture.
      </p>
      <p>
        Text entered by the Professional, such as manual notes, clinical descriptions or reminders.
      </p>

      <p>
        By their very content, this material may contain personal data and sensitive health data.
      </p>

      <p>
        However, CliniScribe has been designed with a “privacy-first” approach, and in the current version of the Service the following applies:
      </p>

      <p>
        CliniScribe does NOT persistently store in the cloud clinical notes, complete transcriptions or the detailed content of patients’ consultations.
      </p>
      <p>
        The clinical content generated (draft notes, summaries, SOAP format) remains mainly in the Professional’s browser, on a temporary basis, so that they can review it, edit it and then copy it or integrate it into their own clinical record system.
      </p>
      <p>
        In order to generate AI responses, audio and text fragments may be processed temporarily and in encrypted form by artificial intelligence and infrastructure technology providers (see section 6), but CliniScribe does not use these data to train models or for any purposes other than the on-demand provision of the Service.
      </p>
      <p>
        The Professional is responsible for not entering patient data that are unnecessary or excessive for the clinical purpose.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        4. For what purposes do we use the data?
      </h3>

      <h4 className="font-semibold text-slate-900 dark:text-white">
        4.1 Data of professionals
      </h4>

      <p>We process professionals’ data for the following main purposes:</p>

      <p><strong>Provision of the Service</strong></p>

      <p>
        To create and manage your account.
      </p>
      <p>
        To allow your access to the platform and its functionalities (for example, generation of draft notes, language configuration).
      </p>
      <p>
        To manage technical incidents, support and communication with the user.
      </p>
      <p>
        Legal basis: performance of the contract or pre-contractual relationship when registering for and using the Service.
      </p>

      <p><strong>Communications related to the Service</strong></p>

      <p>
        To send technical notices, updates, changes to the Terms and to this Policy.
      </p>
      <p>
        To send communications about security, interruptions or critical improvements.
      </p>
      <p>
        Legal basis: performance of the contract and our legitimate interest in maintaining the continuity and security of the Service.
      </p>

      <p><strong>Improvement and development of the Service</strong></p>

      <p>
        Anonymous or aggregated analysis of usage patterns (for example, which modules are used most, response times, performance metrics).
      </p>
      <p>
        Internal research and development to improve functionalities, user experience and performance.
      </p>
      <p>
        Legal basis: our legitimate interest in optimizing the Service, always respecting privacy and, where possible, using aggregated or anonymized data.
      </p>

      <p><strong>Compliance with legal obligations</strong></p>

      <p>
        To respond to requests from authorities.
      </p>
      <p>
        To comply with accounting, tax or regulatory obligations that may apply.
      </p>
      <p>
        Legal basis: compliance with the data controller’s legal obligations.
      </p>

      <h4 className="font-semibold text-slate-900 dark:text-white mt-2">
        4.2 Patients’ data (processed on behalf of the Professional)
      </h4>

      <p>
        With regard to patients’ data that the Professional enters through the Service:
      </p>

      <p>
        The purpose of the processing by CliniScribe is exclusively technical and limited: to transform audio and text into draft clinical notes that the Professional reviews and validates.
      </p>
      <p>
        CliniScribe does not decide or define the clinical purpose (diagnosis, treatment, follow-up) or the legal basis for the processing of those data: that corresponds to the Professional or the healthcare institution.
      </p>
      <p>
        CliniScribe does not use patients’ data:
      </p>
      <p>
        To train third-party models.
      </p>
      <p>
        To train its own models in a way that would allow patients to be identified.
      </p>
      <p>
        For commercial, marketing or independent exploitation purposes.
      </p>
      <p>
        The legal basis in respect of patients is that determined by the Professional as data controller (for example, consent or other authorizations provided for in the applicable health regulations).
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        5. For how long do we keep the data?
      </h3>

      <h4 className="font-semibold text-slate-900 dark:text-white">
        5.1 Data of professionals
      </h4>

      <p>
        We keep the Professional’s account and contact data while their account is active and as long as is necessary for the provision of the Service.
      </p>
      <p>
        Once the cancellation of the account has been requested, we may retain certain minimal information (for example, billing data or access logs) for the time necessary to:
      </p>
      <p>
        Comply with legal obligations.
      </p>
      <p>
        Defend ourselves against potential claims, within the applicable limitation periods.
      </p>
      <p>
        Thereafter, the data will be deleted or anonymized.
      </p>

      <h4 className="font-semibold text-slate-900 dark:text-white mt-2">
        5.2 Patients’ clinical data
      </h4>

      <p>
        CliniScribe does not store clinical notes or complete transcriptions on its servers on a persistent basis.
      </p>
      <p>
        Detailed clinical content is kept in the Professional’s browser, and its persistence depends on the configuration of the browser itself, cache and the user’s decisions.
      </p>
      <p>
        Processing by AI and infrastructure providers is temporary and limited to the time necessary to generate the response.
      </p>
      <p>
        Retention of the final clinical documentation corresponds to the Professional or their institution, in their own systems (clinical record, EMR or others).
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        6. Providers, sub-processors and international transfers
      </h3>

      <h4 className="font-semibold text-slate-900 dark:text-white">
        6.1 Technology providers (sub-processors)
      </h4>

      <p>
        To operate the Service, CliniScribe may rely on third-party technology service providers (“Sub-processors”), including:
      </p>

      <p>
        Cloud infrastructure providers.
      </p>
      <p>
        Audio transcription services and AI language models.
      </p>
      <p>
        Authentication, database and error-monitoring providers.
      </p>

      <p>
        These providers may process personal data solely to provide services to CliniScribe and under our contractual instructions, including obligations of confidentiality, security and non-use for their own purposes.
      </p>

      <p>
        The updated list of the main providers and sub-processors may be made available in the product documentation or on the Site, and may be modified over time to improve the Service, while maintaining equivalent or higher security standards.
      </p>

      <h4 className="font-semibold text-slate-900 dark:text-white mt-2">
        6.2 International data transfers
      </h4>

      <p>
        Some of these providers may be located in or process data in countries other than that of the Professional.
      </p>

      <p>
        By using the Service, the Professional understands and accepts that:
      </p>

      <p>
        Their data and, to the extent necessary and temporary, their patients’ data may be processed in other countries.
      </p>
      <p>
        CliniScribe will require these providers to assume appropriate contractual commitments to guarantee a level of protection similar or superior to that required by the applicable regulations.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        7. Information security
      </h3>

      <p>
        CliniScribe implements reasonable technical and organizational measures to protect personal data against:
      </p>

      <p>
        Unauthorized access, use or disclosure.
      </p>
      <p>
        Accidental loss, destruction or alteration.
      </p>

      <p>
        Among others, encrypted connections are used (for example, HTTPS), controlled management of internal access and good secure development practices.
      </p>

      <p>
        However, no system is completely infallible. The Professional is also responsible for:
      </p>

      <p>
        Maintaining the confidentiality of their credentials.
      </p>
      <p>
        Using secure equipment and networks.
      </p>
      <p>
        Applying the security policies established by their healthcare institution.
      </p>

      <p>
        In the event of a security incident that significantly affects the data, CliniScribe will take reasonable measures to contain it and, where appropriate, inform the Professional and the competent authorities in accordance with the applicable rules.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        8. Rights of professionals over their data
      </h3>

      <p>
        As a Professional user of the Service, you may exercise, in accordance with the applicable regulations, the following rights regarding your personal data:
      </p>

      <p>
        Access: to know what data we process about you.
      </p>
      <p>
        Rectification: to request the correction of inaccurate or incomplete data.
      </p>
      <p>
        Deletion or cancellation: to request the deletion of your data when they are no longer necessary for the purposes indicated, or where permitted by law.
      </p>
      <p>
        Objection: to object to certain processing based on legitimate interests, to the extent allowed by the regulations.
      </p>
      <p>
        Restriction and portability: in the cases and under the conditions provided for in the applicable legislation.
      </p>

      <p>
        To exercise these rights, you can contact us at:
      </p>

      <p>
        support@cliniscribe.io
      </p>

      <p>
        We may request additional information to verify your identity before responding to the request.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        9. Patients’ data: role of the Professional and exercise of rights
      </h3>

      <p>
        With regard to patients’ personal data, CliniScribe acts as a technology provider/data processor and does not have a direct relationship with the data subjects.
      </p>

      <p>
        Therefore:
      </p>

      <p>
        Any request for access, rectification, cancellation or objection submitted by a patient in relation to their clinical data must be addressed to the Professional or healthcare institution responsible for the processing.
      </p>
      <p>
        If a patient contacts CliniScribe directly, we will, to the extent possible, forward the request to the responsible Professional, or indicate to the requester that they should contact their healthcare provider.
      </p>

      <p>
        The Professional undertakes to:
      </p>

      <p>
        Have a valid legal basis to process their patients’ data.
      </p>
      <p>
        Duly inform their patients about the use of technological tools such as CliniScribe, where required by the regulations.
      </p>
      <p>
        Handle data subjects’ rights in accordance with the applicable legislation.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        10. Cookies and similar technologies
      </h3>

      <p>
        CliniScribe and its providers may use cookies and similar technologies on the Site and in the Service to:
      </p>

      <p>
        Maintain the Professional’s logged-in session.
      </p>
      <p>
        Remember certain configuration preferences.
      </p>
      <p>
        Collect aggregated statistical information about use of the platform.
      </p>

      <p>
        In general, we distinguish between:
      </p>

      <p>
        Strictly necessary cookies: essential for the basic functioning of the Service (for example, authentication).
      </p>
      <p>
        Analytics or performance cookies: help us understand how the Service is used, whenever possible in aggregated or anonymized form.
      </p>

      <p>
        The Professional can manage cookies from their browser settings. Please note that disabling certain cookies may affect the functioning of the Service.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        11. Changes to this Policy
      </h3>

      <p>
        We may update this Privacy Policy to reflect changes in the Service, in the regulations or in our data-processing practices.
      </p>

      <p>
        When the changes are substantial, we will seek to inform Professionals by means of a notice on the Site and/or by email with reasonable advance notice, unless the regulations require immediate application.
      </p>

      <p>
        The current version of the Policy will always be available on the Site, indicating the date of the last update. Continued use of the Service after the entry into force of the modifications will constitute acceptance of the new version.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        12. Contact
      </h3>

      <p>
        For any questions related to this Policy or to the processing of your personal data, you can contact us at:
      </p>

      <p>
        SiemprePro SpA<br />
        Cerro el Plomo 5931, office 1213, Las Condes, Metropolitan Region, Chile<br />
        Email: support@cliniscribe.io
      </p>
    </div>
  );

  const contentPT = (
    <div className="space-y-4 text-justify text-slate-600 dark:text-slate-300">
      <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
        POLÍTICA DE PRIVACIDADE DA CLINISCRIBE PARA PRESTADORES DE SAÚDE
      </h2>

      <p>Data de entrada em vigor: 28 de novembro de 2025</p>

      <p>
        A presente Política de Privacidade (a “Política”) descreve como a CliniScribe (doravante, “CliniScribe”, “nós” ou “nosso”) trata os dados pessoais dos profissionais e prestadores de saúde que utilizam o serviço disponibilizado, entre outros, em https://www.cliniscribe.io e na sub-rota https://www.cliniscribe.io/providers (em conjunto, o “Serviço”).
      </p>

      <p>
        Ao criar uma conta ou utilizar o Serviço, você (“o Usuário”, “o Profissional” ou “o Prestador”) declara que leu e compreendeu esta Política.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        1. Quem é o responsável pelo tratamento?
      </h3>

      <p>Para efeitos dos dados pessoais dos profissionais/usuários do Serviço, o responsável pelo tratamento é:</p>

      <p>
        SiemprePro SpA<br />
        RUT: 78.117.275-8<br />
        Endereço: Cerro el Plomo 5931, escritório 1213, Las Condes, Região Metropolitana, Chile<br />
        E-mail de contato: support@cliniscribe.io
      </p>

      <p>
        Em relação aos dados de pacientes que o Profissional introduz ou faz processar por meio do Serviço, a CliniScribe atua como fornecedora de tecnologia e, em termos de proteção de dados, como operadora de tratamento (ou figura equivalente de acordo com a legislação aplicável). O responsável pelo tratamento dos dados dos pacientes é sempre o Profissional ou a instituição de saúde para a qual trabalha.
      </p>

      <p>
        Esta Política aplica-se aos dados tratados pela CliniScribe independentemente do país a partir do qual os profissionais acessem o Serviço. Em caso de conflito entre esta Política e normas imperativas de proteção de dados de uma jurisdição específica, prevalecerão estas últimas, na medida do aplicável.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        2. A quem se aplica esta Política?
      </h3>

      <p>Esta Política aplica-se a:</p>

      <p>
        Profissionais e prestadores de saúde que se cadastram e utilizam a CliniScribe.
      </p>
      <p>
        Usuários que visitam o site associado ao Serviço (por exemplo, https://www.cliniscribe.io e suas sub-rotas), na medida em que sejam coletados dados pessoais.
      </p>
      <p>
        Ela não se dirige ao público em geral nem a pacientes. Os dados de pacientes são processados apenas em nome do Profissional, sob sua responsabilidade.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        3. Quais dados tratamos?
      </h3>

      <h4 className="font-semibold text-slate-900 dark:text-white">
        3.1 Dados dos profissionais/usuários
      </h4>

      <p>Podemos tratar as seguintes categorias de dados sobre o Profissional:</p>

      <p>
        Dados de identificação básicos: nome, sobrenome, país, especialidade ou ocupação, instituição ou centro de saúde em que trabalha (se aplicável).
      </p>
      <p>
        Dados de contato: endereço de e-mail, número de telefone (se fornecido).
      </p>
      <p>
        Dados de conta: nome de usuário, senha criptografada, idioma preferido e configurações de perfil.
      </p>
      <p>
        Dados profissionais: informações sobre a profissão ou função (por exemplo, médico generalista, especialista, psicólogo etc.) e quaisquer outros dados que você decida incluir voluntariamente em seu perfil ou em suas comunicações.
      </p>

      <h4 className="font-semibold text-slate-900 dark:text-white mt-2">
        3.2 Dados técnicos e de uso do Serviço
      </h4>

      <p>
        De forma automática, ao usar o Serviço podemos coletar:
      </p>

      <p>
        Endereço IP, identificadores de dispositivo, sistema operacional, tipo de navegador.
      </p>
      <p>
        Datas e horários de acesso, páginas visitadas, botões utilizados, erros de sistema.
      </p>
      <p>
        Informações básicas sobre o uso do Serviço (por exemplo, número de sessões, volume de consultas realizadas, idioma de uso, tipo de funcionalidade mais utilizada), em formato agregado ou pseudonimizado sempre que possível.
      </p>

      <p>
        Esses dados são usados principalmente para fins de segurança, manutenção e melhoria do Serviço.
      </p>

      <h4 className="font-semibold text-slate-900 dark:text-white mt-2">
        3.3 Dados de pacientes processados em nome do Profissional
      </h4>

      <p>
        Na medida em que o Profissional utilize o Serviço com casos reais, o tratamento de dados de pacientes pode incluir:
      </p>

      <p>
        Áudio da consulta ou trechos de áudio que o Profissional decida captar.
      </p>
      <p>
        Texto inserido pelo Profissional, como notas manuais, descrições clínicas ou lembretes.
      </p>
      <p>
        Pelo próprio conteúdo, esse material pode conter dados pessoais e dados sensíveis de saúde.
      </p>

      <p>
        No entanto, a CliniScribe foi concebida com uma abordagem “privacy-first” (“privacidade em primeiro lugar”) e, na versão atual do Serviço, aplica-se o seguinte:
      </p>

      <p>
        A CliniScribe NÃO armazena de forma persistente na nuvem as notas clínicas, transcrições completas nem o conteúdo detalhado das consultas dos pacientes.
      </p>
      <p>
        O conteúdo clínico gerado (rascunhos de notas, resumos, formato SOAP) permanece principalmente no navegador do Profissional, de forma temporária, para que ele possa revisá-lo, editá-lo e depois copiá-lo ou integrá-lo em seu próprio sistema de prontuário clínico.
      </p>
      <p>
        Para poder gerar respostas de IA, trechos de áudio e texto podem ser processados de forma temporária e criptografada por provedores tecnológicos de inteligência artificial e de infraestrutura (ver seção 6), mas a CliniScribe não utiliza esses dados para treinar modelos nem para quaisquer outros fins diferentes da prestação pontual do Serviço.
      </p>
      <p>
        O Profissional é responsável por não introduzir dados de pacientes que sejam desnecessários ou excessivos para a finalidade clínica.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        4. Para quais finalidades usamos os dados?
      </h3>

      <h4 className="font-semibold text-slate-900 dark:text-white">
        4.1 Dados dos profissionais
      </h4>

      <p>Tratamos os dados dos profissionais para as seguintes finalidades principais:</p>

      <p><strong>Prestação do Serviço</strong></p>

      <p>
        Criar e gerenciar sua conta.
      </p>
      <p>
        Permitir seu acesso à plataforma e às suas funcionalidades (por exemplo, geração de rascunhos de notas, configuração de idioma).
      </p>
      <p>
        Gerenciar incidentes técnicos, suporte e comunicação com o usuário.
      </p>
      <p>
        Base legal: execução do contrato ou da relação pré-contratual ao se cadastrar e utilizar o Serviço.
      </p>

      <p><strong>Comunicações relacionadas ao Serviço</strong></p>

      <p>
        Enviar avisos técnicos, atualizações, alterações nos Termos e nesta Política.
      </p>
      <p>
        Enviar comunicações sobre segurança, interrupções ou melhorias críticas.
      </p>
      <p>
        Base legal: execução do contrato e nosso interesse legítimo em manter a continuidade e a segurança do Serviço.
      </p>

      <p><strong>Melhoria e desenvolvimento do Serviço</strong></p>

      <p>
        Análise anônima ou agregada de padrões de uso (por exemplo, quais módulos são mais utilizados, tempos de resposta, métricas de desempenho).
      </p>
      <p>
        Pesquisa e desenvolvimento internos para melhorar funcionalidades, experiência do usuário e desempenho.
      </p>
      <p>
        Base legal: nosso interesse legítimo em otimizar o Serviço, sempre respeitando a privacidade e, quando possível, utilizando dados agregados ou anonimizados.
      </p>

      <p><strong>Cumprimento de obrigações legais</strong></p>

      <p>
        Atender a solicitações de autoridades.
      </p>
      <p>
        Cumprir obrigações contábeis, fiscais ou regulatórias que possam ser aplicáveis.
      </p>
      <p>
        Base legal: cumprimento das obrigações legais do responsável pelo tratamento.
      </p>

      <h4 className="font-semibold text-slate-900 dark:text-white mt-2">
        4.2 Dados de pacientes (processados em nome do Profissional)
      </h4>

      <p>
        Com relação aos dados de pacientes que o Profissional introduz por meio do Serviço:
      </p>

      <p>
        A finalidade do tratamento por parte da CliniScribe é exclusivamente técnica e limitada: transformar áudio e texto em rascunhos de notas clínicas que o Profissional revisa e valida.
      </p>
      <p>
        A CliniScribe não decide nem define a finalidade clínica (diagnóstico, tratamento, acompanhamento) nem a base legal para o tratamento desses dados: isso corresponde ao Profissional ou à instituição de saúde.
      </p>
      <p>
        A CliniScribe não utiliza os dados de pacientes:
      </p>
      <p>
        Para treinar modelos de terceiros.
      </p>
      <p>
        Para treinar modelos próprios de forma que seja possível identificar pacientes.
      </p>
      <p>
        Para fins comerciais, de marketing ou de exploração independente.
      </p>
      <p>
        A base legal em relação aos pacientes é aquela determinada pelo Profissional como responsável pelo tratamento (por exemplo, consentimento ou outras autorizações previstas na legislação sanitária aplicável).
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        5. Por quanto tempo conservamos os dados?
      </h3>

      <h4 className="font-semibold text-slate-900 dark:text-white">
        5.1 Dados de profissionais
      </h4>

      <p>
        Conservamos os dados de conta e de contato do Profissional enquanto sua conta estiver ativa e enquanto forem necessários para a prestação do Serviço.
      </p>
      <p>
        Uma vez solicitado o cancelamento da conta, poderemos conservar determinadas informações mínimas (por exemplo, dados de faturamento ou registros de acesso) pelo tempo necessário para:
      </p>
      <p>
        Cumprir obrigações legais.
      </p>
      <p>
        Defender-nos contra eventuais reclamações, dentro dos prazos de prescrição aplicáveis.
      </p>
      <p>
        Posteriormente, os dados serão eliminados ou anonimizados.
      </p>

      <h4 className="font-semibold text-slate-900 dark:text-white mt-2">
        5.2 Dados clínicos de pacientes
      </h4>

      <p>
        A CliniScribe não armazena de forma persistente, em seus servidores, as notas clínicas nem as transcrições completas.
      </p>
      <p>
        O conteúdo clínico detalhado é mantido no navegador do Profissional, e sua permanência depende da configuração do próprio navegador, do cache e das decisões do usuário.
      </p>
      <p>
        O processamento por provedores de IA e de infraestrutura é temporário e limitado ao tempo necessário para gerar a resposta.
      </p>
      <p>
        A conservação da documentação clínica final cabe ao Profissional ou à sua instituição, em seus próprios sistemas (prontuário clínico, EMR ou outros).
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        6. Provedores, suboperadores e transferências internacionais
      </h3>

      <h4 className="font-semibold text-slate-900 dark:text-white">
        6.1 Provedores tecnológicos (suboperadores)
      </h4>

      <p>
        Para operar o Serviço, a CliniScribe pode recorrer a terceiros provedores de serviços tecnológicos (“Suboperadores”), incluindo:
      </p>

      <p>
        Provedores de infraestrutura em nuvem.
      </p>
      <p>
        Serviços de transcrição de áudio e modelos de linguagem de IA.
      </p>
      <p>
        Provedores de autenticação, banco de dados e monitoramento de erros.
      </p>

      <p>
        Esses provedores podem tratar dados pessoais exclusivamente para prestar serviços à CliniScribe e sob nossas instruções contratuais, incluindo obrigações de confidencialidade, segurança e não utilização para fins próprios.
      </p>

      <p>
        A lista atualizada dos principais provedores e suboperadores poderá estar disponível na documentação do produto ou no Site e poderá ser modificada ao longo do tempo para melhorar o Serviço, mantendo padrões de segurança equivalentes ou superiores.
      </p>

      <h4 className="font-semibold text-slate-900 dark:text-white mt-2">
        6.2 Transferências internacionais de dados
      </h4>

      <p>
        Alguns desses provedores podem estar localizados ou tratar dados em países diferentes daquele do Profissional.
      </p>

      <p>
        Ao utilizar o Serviço, o Profissional entende e aceita que:
      </p>

      <p>
        Seus dados e, na medida necessária e temporária, os dados de seus pacientes podem ser tratados em outros países.
      </p>
      <p>
        A CliniScribe exigirá desses provedores compromissos contratuais adequados para garantir um nível de proteção semelhante ou superior ao exigido pela legislação aplicável.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        7. Segurança da informação
      </h3>

      <p>
        A CliniScribe implementa medidas técnicas e organizacionais razoáveis para proteger os dados pessoais contra:
      </p>

      <p>
        Acesso, uso ou divulgação não autorizados.
      </p>
      <p>
        Perda, destruição ou alteração acidental.
      </p>

      <p>
        Entre outras, são utilizadas conexões criptografadas (por exemplo, HTTPS), gestão controlada de acessos internos e boas práticas de desenvolvimento seguro.
      </p>

      <p>
        No entanto, nenhum sistema é completamente infalível. O Profissional também é responsável por:
      </p>

      <p>
        Manter a confidencialidade de suas credenciais.
      </p>
      <p>
        Utilizar equipamentos e redes seguros.
      </p>
      <p>
        Aplicar as políticas de segurança estabelecidas por sua instituição de saúde.
      </p>

      <p>
        Em caso de incidente de segurança que afete de forma relevante os dados, a CliniScribe adotará medidas razoáveis para contê-lo e, quando cabível, informará o Profissional e as autoridades competentes, de acordo com as normas aplicáveis.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        8. Direitos dos profissionais sobre seus dados
      </h3>

      <p>
        Como Profissional usuário do Serviço, você pode exercer, de acordo com a legislação aplicável, os seguintes direitos em relação aos seus dados pessoais:
      </p>

      <p>
        Acesso: saber quais dados tratamos sobre você.
      </p>
      <p>
        Retificação: solicitar a correção de dados inexatos ou incompletos.
      </p>
      <p>
        Eliminação ou cancelamento: solicitar a exclusão de seus dados quando eles já não forem necessários para as finalidades indicadas ou quando assim o permita a lei.
      </p>
      <p>
        Oposição: opor-se a determinados tratamentos baseados em interesses legítimos, na medida em que a legislação o permita.
      </p>
      <p>
        Limitação e portabilidade: nos casos e sob as condições previstas na legislação aplicável.
      </p>

      <p>
        Para exercer esses direitos, você pode entrar em contato conosco em:
      </p>

      <p>
        support@cliniscribe.io
      </p>

      <p>
        Poderemos solicitar informações adicionais para verificar sua identidade antes de responder ao pedido.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        9. Dados de pacientes: papel do Profissional e exercício de direitos
      </h3>

      <p>
        Com relação aos dados pessoais de pacientes, a CliniScribe atua como fornecedora de tecnologia/operadora de tratamento e não mantém uma relação direta com os titulares desses dados.
      </p>

      <p>
        Por isso:
      </p>

      <p>
        Qualquer pedido de acesso, retificação, cancelamento ou oposição apresentado por um paciente em relação aos seus dados clínicos deve ser dirigido ao Profissional ou à instituição de saúde responsável pelo tratamento.
      </p>
      <p>
        Se um paciente entrar em contato diretamente com a CliniScribe, encaminharemos o pedido, na medida do possível, ao Profissional responsável ou indicaremos ao solicitante que entre em contato com seu prestador de saúde.
      </p>

      <p>
        O Profissional compromete-se a:
      </p>

      <p>
        Dispor de uma base legal válida para tratar os dados de seus pacientes.
      </p>
      <p>
        Informar adequadamente seus pacientes sobre o uso de ferramentas tecnológicas como a CliniScribe, quando assim o exigir a legislação.
      </p>
      <p>
        Atender aos direitos dos titulares dos dados em conformidade com a legislação aplicável.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        10. Cookies e tecnologias semelhantes
      </h3>

      <p>
        A CliniScribe e seus provedores podem utilizar cookies e tecnologias semelhantes no Site e no Serviço para:
      </p>

      <p>
        Manter a sessão iniciada do Profissional.
      </p>
      <p>
        Lembrar determinadas preferências de configuração.
      </p>
      <p>
        Coletar informações estatísticas agregadas sobre o uso da plataforma.
      </p>

      <p>
        Em geral, distinguimos entre:
      </p>

      <p>
        Cookies estritamente necessários: essenciais para o funcionamento básico do Serviço (por exemplo, autenticação).
      </p>
      <p>
        Cookies de análise ou desempenho: ajudam a entender como o Serviço é utilizado, sempre que possível de forma agregada ou anonimizada.
      </p>

      <p>
        O Profissional pode gerenciar os cookies a partir das configurações do seu navegador. Observe que desativar determinados cookies pode afetar o funcionamento do Serviço.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        11. Alterações a esta Política
      </h3>

      <p>
        Podemos atualizar esta Política de Privacidade para refletir alterações no Serviço, na legislação ou em nossas práticas de tratamento de dados.
      </p>

      <p>
        Quando as alterações forem significativas, procuraremos informar os Profissionais por meio de um aviso no Site e/ou por e-mail com antecedência razoável, salvo se a legislação exigir aplicação imediata.
      </p>

      <p>
        A versão vigente da Política estará sempre disponível no Site, indicando a data da última atualização. O uso continuado do Serviço após a entrada em vigor das modificações implicará a aceitação da nova versão.
      </p>

      <h3 className="font-bold text-slate-900 dark:text-white mt-4">
        12. Contato
      </h3>

      <p>
        Para quaisquer dúvidas relacionadas a esta Política ou ao tratamento de seus dados pessoais, você pode entrar em contato conosco em:
      </p>

      <p>
        SiemprePro SpA<br />
        Cerro el Plomo 5931, escritório 1213, Las Condes, Região Metropolitana, Chile<br />
        E-mail: support@cliniscribe.io
      </p>
    </div>
  );

  switch (language) {
    case 'en': return contentEN;
    case 'pt': return contentPT;
    default: return contentES;
  }
};
