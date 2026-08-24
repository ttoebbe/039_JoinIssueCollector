# Checkliste: Join \- Issue Collector 

Das bestehende Kanban-Board-Projekt (Join) wird um eine KI-gestützte Automatisierung erweitert, die es Stakeholdern ermöglicht, Feature Requests und technische Aufgaben direkt per E-Mail einzureichen. Die E-Mails werden automatisch analysiert, kategorisiert, priorisiert und als Tickets im Board angelegt – mit einer klaren, erlebbaren KI-Logik und einer reibungslosen User Experience für Portfolio und Demo-Zwecke.

# Checkliste: KI-basierter Issue Collector für Kanban-Board (Join) mit n8n

## **Allgemeine Anforderungen & Projektsetup**

- [ ] GitHub Repository ist eingerichtet und Link ist verfügbar.  
- [ ] README.md im GitHub Repository ist aussagekräftig und enthält eine Beschreibung des Projekts sowie eine Anleitung zur Demo-Nutzung.  
- [ ] N8N Projekt (Workflows als JSON-Dateien exportiert) ist im GitHub Repository eingecheckt.  
- [ ] Sensible Daten (API Credentials, E-Mail-Passwörter, N8N\_ENCRYPTION\_KEY etc.) sind **nicht** im GitHub Repository enthalten und über `.gitignore` ausgeschlossen.  
- [ ] Für die Stakeholder-Landing-Page wird semantisches HTML5 verwendet.  
- [ ] Font-Size Standards auf der Landing Page: Mindestens 16px, Kleingedrucktes nicht unter 14px.  
- [ ] JSDoc Dokumentation für komplexe n8n Function-Nodes oder eventuelle Frontend-Skripte der Landing Page.

## **Kernfunktionalitäten: Intelligenter Issue Collector**

### **"Triage"-Spalte als Standard-Backlog**

**User Story**: Als Product Owner, möchte ich eine neue Spalte namens "Triage" im Kanban-Board haben, in der standardmäßig alle neu erstellten Tasks erscheinen, um diese als Backlog für die Priorisierung zu nutzen.

- [ ] Eine neue Spalte namens "Triage" wurde im Join Kanban-Board angelegt.  
- [ ] Die Join-Konfiguration ist so angepasst, dass alle manuell erstellten Tasks standardmäßig in der "Triage"-Spalte landen.

### **E-Mail-Empfang & Verarbeitung**

**User Story**:  
Als Product Owner möchte ich über ein dediziertes E-Mail-Postfach Feature Requests und Bug-Meldungen von Stakeholdern entgegennehmen, damit neue Aufgaben automatisch erfasst und weiterverarbeitet werden können.

- [ ] Automatischer Empfang von E-Mails über das dedizierte Postfach ist sichergestellt.  
- [ ] Der n8n-Workflow wird bei Eingang einer neuen E-Mail zuverlässig getriggert.  
- [ ] Am Ende des n8n Workflows wird die Mail bei erfolgreicher Verarbeitung  in den Ordner “erledigt” des Postfachs verschoben.

### **KI-Parsing, Klassifizierung & Ticket-Erstellung in "Triage"-Spalte**

**User Story**: Als Product Owner, möchte ich E-Mail-Inhalte per KI analysieren, um Kategorie, Titel, Priorität und Deadline zu bestimmen, einen KI-Generierungshinweis hinzuzufügen und automatisiert als neues Ticket in einer dedizierten "Triage"-Spalte im Kanban-Board anlegen.

- [ ] E-Mail-Inhalte (Absender, Betreff, Body) werden extrahiert.  
- [ ] KI-Analyse mittels entsprechendem Node in n8n zur Verarbeitung des E-Mail-Textes.  
- [ ] Korrekte Bestimmung der Kategorie des Issues (z.B. technischer Task vs. User Story/Feature vs. Bug Request).  
- [ ] Generierung eines prägnanten, passenden Titels für das Join-Ticket.  
- [ ] Automatische Setzung der Priorität (urgent, medium, low) basierend auf Schlüsselwörtern im E-Mail-Text.  
- [ ] Zuverlässige Extraktion einer Deadline aus dem E-Mail-Text, falls vorhanden.  
- [ ] Automatisches Hinzufügen eines Hinweises wie "Dieses Ticket wurde KI-generiert" im Beschreibungstext des Tickets.  
- [ ] Alle manuell über Join erstellten Tickets landen per Default in der "Triage"-Spalte.  
- [ ] Alle automatisch per E-Mail generierten Tickets landen initial korrekt in der neu eingerichteten "Triage"-Spalte.  
- [ ] Sofern ein Fehler bei der Verarbeitung auftritt, wie der eingehende Mail in den Ordner “zu bearbeiten” des Postfachs verschoben.

## **Stakeholder-Experience & Landing Page**

**User Story**: Als Stakeholder möchte ich Feature Requests per E-Mail einreichen können und auf einer Landing Page verstehen, wie das System funktioniert und wie ich es für eine Demo nutzen kann.

- [ ] Eine Stakeholder-Landing-Page ist erstellt und zugänglich.  
- [ ] Die Landing-Page erklärt klar den Prozess, wie Feature Requests per E-Mail eingereicht werden können (inkl. der zu verwendenden E-Mail-Adresse).  
- [ ] Optionale Weiche auf der Landing-Page: "Feature Request stellen" vs. "Projekt als Teammitglied betreten/Kanban-Board erkunden".  
- [ ] Das Tageslimit für Anfragen wird transparent auf der Landing-Page kommuniziert.  
- [ ] Gelangt trotz Erreichen des Limits eine Mail in das Postfach, erhält der Absender eine automatische E-Mail Antwort mit einem Hinweis auf das Tageslimit.  
- [ ] Der Stakeholder bekommt eine Bestätigungsmail sofern, das Ticket auf dem Board angelegt wurde  
- [ ] Sofern es einen Fehler bei der Verarbeitung gab, bekommt der Absender den Hinweis, dass das Team die E-Mail erhalten hat und sich zeitnah meldet.

### **Ersteller-Funktion mit Benachrichtigung bei Statusänderung**

**User Story**: Als Absender einer E-Mail möchte ich automatisch als Ersteller für das Ticket im Kanban-Board hinzugefügt werden, um über dessen Fortschritt informiert zu werden.

- [ ] Der Absender der E-Mail wird automatisch als Ersteller für das neu generierte Ticket im Kanban-Board gesetzt (via API des Join-Projekts).  
- [ ] Im Task-Detail des Kanban-Boards ist sichtbar, wer Ersteller des Tickets ist (z.B. E-Mail-Adresse des Absenders).  
- [ ] Sofern ein Ticket manuell erstellt wird, wird dieser User ebenfalls als Ersteller im Ticket aufgeführt.  
- [ ] Man kann in der Ticketdetailsansicht unterscheiden, ob der Ersteller “intern” oder “extern” als Stakeholder das Ticket angelegt hat.  
- [ ] Sofern das Ticket in eine andere Spalte verschoben wird, wird der Ersteller per E-Mail benachrichtigt. Die E-Mail-Benachrichtigung soll via n8n versendet werden.   
      

### **Throttling & Kostenairbag**

**User Story (Admin)**: Als Systemadministrator möchte ich die Anzahl der per E-Mail erstellten Feature Requests auf 10 pro Tag begrenzen, um API-Kosten (insb. KI-Service) zu kontrollieren und eine faire Nutzung der Demo zu gewährleisten. 

**User Story (Nutzer)**: Als Nutzer, der eine Anfrage einreicht, möchte ich klar informiert werden, wenn das Tageslimit für neue Anfragen erreicht ist.

- [ ] Implementierung einer Limitierung von maximal 10 Feature Requests pro Tag, die über den E-Mail-Issue-Collector erstellt werden können.  
- [ ] N8n zählt zuverlässig die Anzahl der pro Tag per E-Mail generierten Tickets (z.B. über interne n8n-Variablen, externe Datenbank oder Google Sheet).  
- [ ] Bei Überschreiten des Limits von 10 Anfragen wird kein weiteres Ticket im Kanban-Board erstellt.   
- [ ] **Kostenairbag-Funktion:** Die Limitierung dient aktiv als Schutz vor unerwartet hohen Kosten durch exzessive Nutzung der KI-API.  
        
      

